import { ObjectId } from 'mongodb';
import { findUserById, resolvePermissions, usersCol, type UserDoc } from '@vokop/service-auth';

export { findUserById, resolvePermissions };

export async function listUsers(): Promise<UserDoc[]> {
  return usersCol().find().sort({ createdAt: -1 }).toArray();
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<UserDoc, 'roleIds' | 'status' | 'name' | 'kind'>>,
): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const result = await usersCol().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}
