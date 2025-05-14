export interface User {
  id?: number; // El ID es opcional al crear, pero presente al leer/actualizar/eliminar
  name: string;
  email: string;
  phone: string;
  image: string;
  code?: string;
  email_verified_at?: string | null; // Estos campos pueden venir de tu API
  created_at?: string;
  updated_at?: string;
}

export interface UsersApiResponse {
  data: User[];
}
