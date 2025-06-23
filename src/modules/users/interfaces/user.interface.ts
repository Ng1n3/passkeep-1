export interface IUser {
  id: string;
  email: string;
  password: string;
  username: string;
  is_activated: boolean;
  created_at: Date;
  updated_at: Date;
}
