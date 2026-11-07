export type Role = "ceo" | "vendedor";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_adm: boolean;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
}

export interface SettingRow {
  key: string;
  value: unknown;
  active: boolean;
  description: string;
  updated_at: string;
}
