import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    component: MainLayoutComponent, // Usamos un layout para las rutas protegidas
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' } // Redirige a dashboard por defecto dentro del layout
    ]
  },
  // Ruta para manejar accesos directos a la raíz cuando no está logueado
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  // Ruta comodín para páginas no encontradas (opcional pero recomendado)
  { path: '**', redirectTo: '/login' } // O a una página 404 dedicada
];
