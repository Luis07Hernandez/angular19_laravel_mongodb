import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://laravel.lndo.site/api';
  private http = inject(HttpClient);
  private router = inject(Router);

  // BehaviorSubject para mantener el estado de autenticación actual
  // Se inicializa con el valor del token en localStorage (si existe)
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() { }

  private saveToken(token: string): void {
    localStorage.setItem('authToken', token);
    this.isAuthenticatedSubject.next(true);
  }

  private removeToken(): void {
    localStorage.removeItem('authToken');
    this.isAuthenticatedSubject.next(false);
  }

  public getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('authToken');
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        // Asumiendo que la API devuelve un token en response.token o similar
        if (response && response.token) {
          this.saveToken(response.token);
        } else if (response && response.access_token) { // Otra forma común de devolver el token
           this.saveToken(response.access_token);
        } else {
          // Manejar el caso donde el token no está presente en la respuesta esperada
          console.warn('Token no encontrado en la respuesta del login:', response);
          // Podrías querer lanzar un error aquí o manejarlo de otra forma
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => {
        // Asumiendo que la API devuelve un token también en el registro
         if (response && response.token) {
          this.saveToken(response.token);
        } else if (response && response.access_token) {
           this.saveToken(response.access_token);
        } else {
          console.warn('Token no encontrado en la respuesta del registro:', response);
        }
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}
