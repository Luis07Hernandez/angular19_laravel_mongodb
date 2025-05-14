// src/app/features/users/users.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h2>Administrar Usuarios</h2>
      <p>Aquí se mostrará la lista de usuarios y opciones de administración.</p>
      </div>
  `,
  styles: []
})
export class UsersComponent { }
