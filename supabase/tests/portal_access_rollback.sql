begin;
-- Run after portal_access_completion.sql; only synthetic fixture mutations are rolled back.
-- To test an unapplied candidate, insert its contents immediately after BEGIN in this transaction.
insert into auth.users(id,email) values
('10000000-0000-4000-8000-000000000001','audit-admin@example.invalid'),
('10000000-0000-4000-8000-000000000002','audit-viewer@example.invalid'),
('10000000-0000-4000-8000-000000000003','audit-inactive@example.invalid'),
('10000000-0000-4000-8000-000000000004','audit-director@example.invalid'),
('10000000-0000-4000-8000-000000000005','audit-leader@example.invalid'),
('10000000-0000-4000-8000-000000000006','audit-assessor@example.invalid');
update auth.users set email_confirmed_at=now() where email like 'audit-%@example.invalid';
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000007','audit-unverified@example.invalid');
update public.profiles set role = case right(id::text,1) when '1' then 'admin' when '3' then 'admin' when '4' then 'director' when '5' then 'leader' when '6' then 'assessor' else 'viewer' end,
full_name = case right(id::text,1) when '2' then 'Audit Viewer' else '' end,
leader_scope = 'AUDIT-ROLLBACK',is_active = right(id::text,1) <> '3'
where email like 'audit-%@example.invalid';
insert into public.specialists(name,leader_scope,department,position,is_active) values ('Audit Viewer','AUDIT-ROLLBACK','Audit','Audit',true);
insert into public.assessments(type,spec,oce,assessment_date,period,status,leader_scope) values
('r','Audit Viewer','Other',current_date,'AUDIT-ROLLBACK','approved','AUDIT-ROLLBACK'),
('r','audit-viewer@example.invalid','Other',current_date,'AUDIT-ROLLBACK','approved','AUDIT-ROLLBACK'),
('r','10000000-0000-4000-8000-000000000002','Other',current_date,'AUDIT-ROLLBACK','approved','AUDIT-ROLLBACK'),
('r','Other','Audit Viewer',current_date,'AUDIT-ROLLBACK','approved','AUDIT-ROLLBACK'),
('r','Audit Viewer','Other',current_date,'AUDIT-ROLLBACK','review','AUDIT-ROLLBACK'),
('r','','Other',current_date,'AUDIT-ROLLBACK','approved','AUDIT-ROLLBACK');
insert into public.assessment_comments(assessment_id,body,created_by) select id,'Audit comment','10000000-0000-4000-8000-000000000001' from public.assessments where period='AUDIT-ROLLBACK';
insert into public.assessments(type,spec,assessment_date,period,status,leader_scope) values ('r','audit-unverified@example.invalid',current_date,'AUDIT-UNVERIFIED','approved','AUDIT-ROLLBACK');
set local role authenticated;
do $$
declare subject text; rejected boolean;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000007',true);
  if exists(select from public.assessments where period='AUDIT-UNVERIFIED') then raise exception 'Unverified email granted access'; end if;
  foreach subject in array array[
    '10000000-0000-4000-8000-000000000099', -- missing profile
    '10000000-0000-4000-8000-000000000003', -- inactive
    '10000000-0000-4000-8000-000000000002', -- viewer
    '10000000-0000-4000-8000-000000000004', -- director
    '10000000-0000-4000-8000-000000000005', -- leader
    '10000000-0000-4000-8000-000000000006' -- assessor
  ] loop
    perform set_config('request.jwt.claim.sub',subject,true);
    rejected := false;
    begin
      perform public.admin_update_profile('10000000-0000-4000-8000-000000000002','Escalated','admin','AUDIT-ROLLBACK',true);
    exception when others then
      if sqlerrm <> 'Admin role required' then raise; end if;
      rejected := true;
    end;
    if not rejected then raise exception 'Unauthorized RPC succeeded for %',subject; end if;
    begin
      perform public.admin_link_viewer('10000000-0000-4000-8000-000000000002','Audit Viewer');
      raise exception 'Unauthorized binding succeeded';
    exception when others then
      if sqlerrm <> 'Admin role required' then raise; end if;
    end;
  end loop;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  if (select count(*) from public.assessments where period='AUDIT-ROLLBACK') <> 2 then
    raise exception 'Signup display name granted untrusted access';
  end if;
  begin
    perform public.admin_link_viewer('10000000-0000-4000-8000-000000000002','Audit Viewer');
    raise exception 'Viewer granted itself a binding';
  exception when others then
    if sqlerrm <> 'Admin role required' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  perform public.admin_link_viewer('10000000-0000-4000-8000-000000000002','Audit Viewer');
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  if (select count(*) from public.assessments where period='AUDIT-ROLLBACK') <> 3 then
    raise exception 'Viewer policy returned the wrong set';
  end if;
  if (select count(*) from public.assessment_comments where body='Audit comment') <> 3 then raise exception 'Comments did not follow assessment access'; end if;
  if exists(select from public.assessments where period='AUDIT-ROLLBACK' and (status <> 'approved' or spec not in ('Audit Viewer','audit-viewer@example.invalid','10000000-0000-4000-8000-000000000002'))) then raise exception 'Foreign row visible'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  if public.my_role() is not null then raise exception 'Inactive profile retained a role'; end if;
  if exists(select from public.assessments where period='AUDIT-ROLLBACK') then raise exception 'Inactive profile retained assessment access'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  -- The assessor may read its scope but cannot make the leader's decision.
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
  if (select count(*) from public.assessments where period='AUDIT-ROLLBACK') <> 6 then raise exception 'Assessor lost scope access'; end if;
  begin
    update public.assessments set status='review' where period='AUDIT-ROLLBACK' and status='approved';
    raise exception 'Assessor changed status';
  exception when others then
    if sqlerrm <> 'Status decision requires admin or leader' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
  if (select count(*) from public.assessments where period='AUDIT-ROLLBACK') <> 6 then raise exception 'Leader lost scope access'; end if;
  update public.assessments set status='approved' where period='AUDIT-ROLLBACK' and status='review';
  update public.assessments set status='archived' where period='AUDIT-ROLLBACK' and status='approved';
  update public.assessments set status='submitted' where period='AUDIT-ROLLBACK' and status='archived';
  update public.assessments set status='review' where period='AUDIT-ROLLBACK' and status='submitted';
  if (select count(*) from public.assessments where period='AUDIT-ROLLBACK' and status='review') <> 6 then raise exception 'Leader workflow failed'; end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  perform public.admin_update_profile_with_binding('10000000-0000-4000-8000-000000000002','Audit Viewer','viewer','AUDIT-ROLLBACK',true,'Audit Viewer');
  begin
    perform public.admin_update_profile_with_binding('10000000-0000-4000-8000-000000000002','Partial change','viewer','AUDIT-ROLLBACK',true,'Unknown specialist');
    raise exception 'Unknown binding accepted';
  exception when others then
    if sqlerrm <> 'Select one unique active specialist' then raise; end if;
  end;
  if (select full_name from public.profiles where id='10000000-0000-4000-8000-000000000002') <> 'Audit Viewer' then raise exception 'Atomic profile save partially committed'; end if;
  if (select count(*) from public.assessments where period='AUDIT-ROLLBACK') <> 6 then raise exception 'Administrator lost legitimate access'; end if;
  -- Full operational path and a foreign-scope denial, still inside rollback.
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
  insert into public.assessments(id,type,spec,assessment_date,period,status,leader_scope)
    values('10000000-0000-4000-8000-000000000077','r','Audit Viewer',current_date,'AUDIT-FLOW','submitted','AUDIT-ROLLBACK');
  begin
    insert into public.assessments(type,spec,assessment_date,period,status,leader_scope)
      values('r','Audit Viewer',current_date,'AUDIT-FLOW','submitted','FOREIGN-SCOPE');
    raise exception 'Assessor inserted into foreign scope';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.assessments(type,spec,assessment_date,period,status,leader_scope)
      values('r','Audit Viewer',current_date,'AUDIT-FLOW','approved','AUDIT-ROLLBACK');
    raise exception 'Assessor inserted approved card';
  exception when others then
    if sqlerrm <> 'New assessment must be submitted' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
  update public.assessments set status='review' where period='AUDIT-FLOW';
  update public.assessments set status='approved' where period='AUDIT-FLOW';
  insert into public.assessment_comments(assessment_id,body,created_by)
    values('10000000-0000-4000-8000-000000000077','Audit flow comment',auth.uid());
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  if (select count(*) from public.assessments where period='AUDIT-FLOW' and status='approved') <> 1 then raise exception 'Viewer did not receive approved card'; end if;
  if (select count(*) from public.assessment_comments where body='Audit flow comment') <> 1 then raise exception 'Viewer did not receive approved feedback'; end if;

end $$;
set local role anon;
do $$
begin
  begin
    perform public.admin_update_profile('10000000-0000-4000-8000-000000000002','Escalated','admin','AUDIT-ROLLBACK',true);
    raise exception 'Anonymous RPC succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: privileged RPC and trusted binding boundaries; atomic profile save; viewer rows/comments; assessor submit, leader review/approve, viewer read; foreign scope denied; fixtures rolled back' as result;
