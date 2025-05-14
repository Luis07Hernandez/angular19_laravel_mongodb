import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true; // Usuario autenticado, permite el acceso
  } else {
    // Usuario no autenticado, redirige a la página de login
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
