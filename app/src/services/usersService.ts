import type { DataProvider, ManagedUser } from '../domain/types'

export function createUsersService(provider: DataProvider) {
  return {
    listUsers: () => provider.listUsers?.() || Promise.resolve([] as ManagedUser[]),
    createUser: (user: ManagedUser) => provider.createUser?.(user) || Promise.reject(new Error('Provider nie obsluguje tworzenia uzytkownikow.')),
    updateUser: (user: ManagedUser) => provider.updateUser?.(user) || Promise.reject(new Error('Provider nie obsluguje aktualizacji uzytkownikow.')),
  }
}

