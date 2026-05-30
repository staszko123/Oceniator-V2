import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

type RoleName = 'viewer' | 'leader'

type RoleFixture = {
  id: string
  email: string
  password: string
  fullName: string
  role: RoleName
  leaderScope: string
  client: SupabaseClient
  createdViaServiceRole: boolean
}

type AssessmentFixture = {
  id: string
  spec: string
  leaderScope: string
}

const env = {
  url: process.env.SUPABASE_URL?.trim() || '',
  anonKey: process.env.SUPABASE_ANON_KEY?.trim() || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
  adminEmail: process.env.SUPABASE_TEST_ADMIN_EMAIL?.trim() || '',
  adminPassword: process.env.SUPABASE_TEST_ADMIN_PASSWORD?.trim() || '',
  viewerEmail: process.env.SUPABASE_TEST_VIEWER_EMAIL?.trim() || '',
  viewerPassword: process.env.SUPABASE_TEST_VIEWER_PASSWORD?.trim() || '',
  leaderEmail: process.env.SUPABASE_TEST_LEADER_EMAIL?.trim() || '',
  leaderPassword: process.env.SUPABASE_TEST_LEADER_PASSWORD?.trim() || '',
}

const canRun = Boolean(env.url && env.anonKey && env.adminEmail && env.adminPassword)

const describeIntegration = canRun ? describe : describe.skip

function createAnonClient(): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

function createServiceClient(): SupabaseClient | null {
  if (!env.serviceRoleKey) return null
  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function signInClient(email: string, password: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createAnonClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    throw new Error(`Nie udało się zalogować ${email}: ${error?.message || 'brak użytkownika w sesji'}`)
  }
  return { client, userId: data.user.id }
}

async function loadProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('id,email,full_name,role,leader_scope,is_active')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error(`Nie udało się pobrać profilu ${userId}: ${error?.message || 'brak danych'}`)
  }

  return data
}

async function createRoleFixture(role: RoleName, fallbackFullName: string, fallbackLeaderScope: string): Promise<RoleFixture | null> {
  const existingEmail = role === 'viewer' ? env.viewerEmail : env.leaderEmail
  const existingPassword = role === 'viewer' ? env.viewerPassword : env.leaderPassword

  if (existingEmail && existingPassword) {
    const { client, userId } = await signInClient(existingEmail, existingPassword)
    const profile = await loadProfile(client, userId)
    expect(profile.role).toBe(role)

    return {
      id: userId,
      email: profile.email || existingEmail,
      password: existingPassword,
      fullName: profile.full_name || fallbackFullName,
      role,
      leaderScope: profile.leader_scope || fallbackLeaderScope,
      client,
      createdViaServiceRole: false,
    }
  }

  const serviceClient = createServiceClient()
  if (!serviceClient) return null

  const suffix = randomUUID().slice(0, 8)
  const email = `${role}.${suffix}@integration.local`
  const password = `Test-${suffix}-2026!`
  const fullName = `${fallbackFullName} ${suffix}`

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createError || !created.user) {
    throw new Error(`Nie udało się utworzyć testowego konta ${role}: ${createError?.message || 'brak usera'}`)
  }

  const leaderScope = fallbackLeaderScope || `${fullName} scope`
  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: created.user.id,
    email,
    full_name: fullName,
    role,
    leader_scope: leaderScope,
    is_active: true,
  })
  if (profileError) {
    throw new Error(`Nie udało się zapisać profilu ${role}: ${profileError.message}`)
  }

  const { client, userId } = await signInClient(email, password)
  const profile = await loadProfile(client, userId)
  expect(profile.role).toBe(role)

  return {
    id: userId,
    email,
    password,
    fullName: profile.full_name || fullName,
    role,
    leaderScope: profile.leader_scope || leaderScope,
    client,
    createdViaServiceRole: true,
  }
}

async function insertAssessment(client: SupabaseClient, payload: Partial<Record<string, unknown>>): Promise<AssessmentFixture> {
  const id = String(payload.id || randomUUID())
  const row = {
    id,
    type: 'r',
    spec: '',
    stand: 'Specjalista testowy',
    dzial: 'Kontrola jakości',
    oce: 'Administrator systemu',
    assessment_date: new Date().toISOString().slice(0, 10),
    period: 'P1 2026',
    avg_final: 98,
    rating: 'great',
    scores: {},
    gold: [],
    contact_ids: [],
    notes: { general: '', perContact: {} },
    gold_desc: '',
    contact_count: 1,
    status: 'submitted',
    status_history: [],
    leader_scope: '',
    ...payload,
  }

  const { data, error } = await client
    .from('assessments')
    .insert(row)
    .select('id,spec,leader_scope,created_by')
    .single()

  if (error || !data) {
    throw new Error(`Nie udało się zapisać testowej karty ${id}: ${error?.message || 'brak danych'}`)
  }

  expect(data.id).toBe(id)
  expect(data.spec).toBe(String(row.spec))

  return {
    id,
    spec: String(row.spec),
    leaderScope: String(row.leader_scope || ''),
  }
}

describeIntegration('Supabase integration', () => {
  let adminClient: SupabaseClient
  let serviceClient: SupabaseClient | null = null
  let adminId = ''
  let adminFullName = env.adminEmail
  let viewerFixture: RoleFixture | null = null
  let leaderFixture: RoleFixture | null = null
  let allowedAssessment: AssessmentFixture | null = null
  let foreignAssessment: AssessmentFixture | null = null
  let tempHistoryId: string | null = null
  const tempAuthUsers: string[] = []

  beforeAll(async () => {
    adminClient = createAnonClient()
    serviceClient = createServiceClient()

    const { data, error } = await adminClient.auth.signInWithPassword({
      email: env.adminEmail,
      password: env.adminPassword,
    })
    if (error || !data.user) {
      throw new Error(`Nie udało się zalogować admina testowego: ${error?.message || 'brak usera'}`)
    }

    adminId = data.user.id
    const profile = await loadProfile(adminClient, adminId)
    expect(profile.role).toBe('admin')
    adminFullName = profile.full_name || env.adminEmail

    viewerFixture = await createRoleFixture('viewer', 'Specjalista testowy', 'Testowy lider')
    leaderFixture = await createRoleFixture('leader', 'Lider testowy', 'Zespół testowy')

    if (serviceClient && viewerFixture?.createdViaServiceRole) {
      tempAuthUsers.push(viewerFixture.id)
    }
    if (serviceClient && leaderFixture?.createdViaServiceRole) {
      tempAuthUsers.push(leaderFixture.id)
    }
  })

  afterAll(async () => {
    if (serviceClient) {
      if (allowedAssessment?.id) {
        await serviceClient.from('assessments').delete().eq('id', allowedAssessment.id)
      }
      if (foreignAssessment?.id) {
        await serviceClient.from('assessments').delete().eq('id', foreignAssessment.id)
      }
      if (tempHistoryId) {
        await serviceClient.from('admin_history').delete().eq('id', tempHistoryId)
      }
      for (const userId of tempAuthUsers) {
        await serviceClient.auth.admin.deleteUser(userId)
      }
    } else {
      if (allowedAssessment?.id) {
        await adminClient.from('assessments').delete().eq('id', allowedAssessment.id)
      }
      if (foreignAssessment?.id) {
        await adminClient.from('assessments').delete().eq('id', foreignAssessment.id)
      }
    }
  })

  it('allows admin to write assessments and stamps created_by', async () => {
    const sharedScope = leaderFixture?.leaderScope || viewerFixture?.leaderScope || `scope-${randomUUID().slice(0, 6)}`
    allowedAssessment = await insertAssessment(adminClient, {
      spec: viewerFixture?.fullName || 'Specjalista testowy',
      leader_scope: sharedScope,
      oce: adminFullName,
      stand: 'Specjalista jakości',
      dzial: 'Kontrola',
    })

    const { data, error } = await adminClient
      .from('assessments')
      .select('id,spec,leader_scope,created_by')
      .eq('id', allowedAssessment.id)
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBe(allowedAssessment.id)
    expect(data?.created_by).toBe(adminId)
    expect(data?.leader_scope).toBe(sharedScope)
  })

  it('keeps a foreign assessment hidden from the leader scope', async () => {
    const sharedScope = leaderFixture?.leaderScope || viewerFixture?.leaderScope || `scope-${randomUUID().slice(0, 6)}`
    foreignAssessment = await insertAssessment(adminClient, {
      spec: 'Inny specjalista testowy',
      leader_scope: `${sharedScope}-foreign`,
      oce: adminFullName,
      stand: 'Specjalista jakości',
      dzial: 'Kontrola',
    })

    if (!leaderFixture) {
      return
    }

    const { data: visibleData, error: visibleError } = await leaderFixture.client
      .from('assessments')
      .select('id,spec,leader_scope')
      .eq('id', allowedAssessment?.id || '')
      .single()

    expect(visibleError).toBeNull()
    expect(visibleData?.id).toBe(allowedAssessment?.id)
    expect(visibleData?.leader_scope).toBe(sharedScope)

    const { data: hiddenData, error: hiddenError } = await leaderFixture.client
      .from('assessments')
      .select('id,spec,leader_scope')
      .eq('id', foreignAssessment.id)
    
    expect(hiddenError).toBeNull()
    expect(hiddenData || []).toHaveLength(0)
  })

  it('lets viewer read only own assessments and blocks admin_history insert', async () => {
    if (!viewerFixture || !allowedAssessment) {
      return
    }

    const { data: visibleData, error: visibleError } = await viewerFixture.client
      .from('assessments')
      .select('id,spec,leader_scope')
      .eq('id', allowedAssessment.id)
      .single()

    expect(visibleError).toBeNull()
    expect(visibleData?.id).toBe(allowedAssessment.id)
    expect(visibleData?.spec).toBe(viewerFixture.fullName)

    const { data: hiddenData, error: hiddenError } = await viewerFixture.client
      .from('assessments')
      .select('id')
      .eq('id', foreignAssessment?.id || '')

    expect(hiddenError).toBeNull()
    expect(hiddenData || []).toHaveLength(0)

    const { error: historyError } = await viewerFixture.client.from('admin_history').insert({
      description: 'viewer should not write admin_history',
      changed_by: viewerFixture.id,
    })
    expect(historyError).toBeTruthy()
  })

  it('writes admin_history when service role cleanup is available', async () => {
    if (!serviceClient) {
      return
    }

    const description = `Integration history ${randomUUID()}`
    const { data, error } = await adminClient
      .from('admin_history')
      .insert({
        description,
        changed_by: adminId,
      })
      .select('id,description,changed_by')
      .single()

    expect(error).toBeNull()
    expect(data?.description).toBe(description)
    expect(data?.changed_by).toBe(adminId)
    tempHistoryId = data?.id || null
  })
})
