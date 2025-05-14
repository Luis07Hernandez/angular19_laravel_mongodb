import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { User, UsersApiResponse } from '../models/user.model'; // Asegúrate que la ruta sea correcta
import { AuthService } from './auth.service'; // Asegúrate que la ruta sea correcta

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://laravel.lndo.site/api/users';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}` // Asumiendo autenticación Bearer Token
    });
  }

  getUsers(): Observable<User[]> {
    return this.http.get<UsersApiResponse>(this.apiUrl, { headers: this.getAuthHeaders() })
      .pipe(
        map(response => response.data) // Extrae solo el array de usuarios
      );
  }

  getUserById(id: string): Observable<User> { // Asumiendo que la API devuelve un solo usuario directamente
    return this.http.get<User>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  createUser(user: Omit<User, 'id' | 'email_verified_at' | 'created_at' | 'updated_at'>): Observable<User> {
    // El cuerpo de la solicitud según tu ejemplo
    const requestBody = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image
    };
    return this.http.post<User>(this.apiUrl, requestBody, { headers: this.getAuthHeaders() });
  }

  updateUser(id: string, user: Partial<Omit<User, 'id' | 'email_verified_at' | 'created_at' | 'updated_at'>>): Observable<User> {
     // El cuerpo de la solicitud según tu ejemplo de actualización
     const requestBody = {
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone
    };
    // Filtra las propiedades undefined para no enviarlas si no se modificaron y no son obligatorias en el PATCH
    const filteredBody = Object.fromEntries(Object.entries(requestBody).filter(([_, v]) => v !== undefined));
    return this.http.patch<User>(`${this.apiUrl}/${id}`, filteredBody, { headers: this.getAuthHeaders() });
  }

  deleteUser(id: string): Observable<any> { // La API de borrado podría no devolver contenido o un mensaje de éxito
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() });
  }
}
