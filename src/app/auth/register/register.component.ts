import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required] // Campo común en Laravel para confirmar contraseña
  }, { validators: this.passwordMatchValidator });

  errorMessage: string | null = null;

  // Validador personalizado para asegurar que las contraseñas coincidan
  passwordMatchValidator(form: FormBuilder | any) {
    return form.get('password').value === form.get('password_confirmation').value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.errorMessage = null;
    if (this.registerForm.valid) {
      const { name, email, password, password_confirmation } = this.registerForm.value;
      // Asegúrate de que los nombres de campo coincidan con lo que espera tu API Laravel
      const userData = { name, email, password, password_confirmation };

      this.authService.register(userData).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']); // O a login para que inicie sesión
        },
        error: (err) => {
          console.error('Error en el registro:', err);
          this.errorMessage = 'Error al registrar. Intenta de nuevo.';
          if (err.error && err.error.errors) {
            // Laravel suele devolver errores de validación así
            const errors = err.error.errors;
            let messages: string[] = [];
            for (const key in errors) {
              if (errors.hasOwnProperty(key)) {
                messages = messages.concat(errors[key]);
              }
            }
            this.errorMessage = messages.join(' ');
          } else if (err.error?.message) {
            this.errorMessage = err.error.message;
          }
        }
      });
    } else {
      this.registerForm.markAllAsTouched(); // Marcar todos los campos como tocados para mostrar errores
    }
  }
}
