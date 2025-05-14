// src/app/features/products/products.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h2>Administrar Productos</h2>
      <p>Aquí se mostrará la lista de productos y opciones de administración.</p>
      </div>
  `,
  styles: []
})
export class ProductsComponent { }
