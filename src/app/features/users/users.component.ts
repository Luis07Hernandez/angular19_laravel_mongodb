import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, inject, signal, WritableSignal, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Para la gestión de suscripciones moderna

import { User } from '../../core/models/user.model'; // Asegúrate que la ruta sea correcta
import { UserService } from '../../core/services/user.service'; // Asegúrate que la ruta sea correcta

// Declaraciones para jQuery y Bootstrap, ya que DataTables y el modal de Bootstrap los requieren
declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,        // Necesario para ngClass, pipes, etc. (aunque usemos @if/@for)
    ReactiveFormsModule  // Para Reactive Forms (formGroup, formControlName)
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, AfterViewInit, OnDestroy {
  // Referencias a elementos del DOM
  @ViewChild('usersTable') usersTable!: ElementRef<HTMLTableElement>;
  @ViewChild('userModal') userModalElem!: ElementRef<HTMLDivElement>;

  // Inyección de dependencias moderna
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef); // Aún útil para forzar detección con librerías externas como DataTables
  private destroyRef = inject(DestroyRef); // Para takeUntilDestroyed

  // Estado del componente gestionado con Signals
  users: WritableSignal<User[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string | null> = signal(null);
  isEditMode: WritableSignal<boolean> = signal(false);
  currentUserId: WritableSignal<number | null> = signal(null);

  userForm!: FormGroup; // FormGroup sigue siendo la forma estándar para formularios complejos
  private modalInstance: any; // Instancia del modal de Bootstrap
  private dataTable: any;     // Instancia de DataTables

  constructor() {
    this.initUserForm();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    // Inicializar el modal de Bootstrap después de que la vista se haya inicializado
    if (this.userModalElem && this.userModalElem.nativeElement) {
      this.modalInstance = new bootstrap.Modal(this.userModalElem.nativeElement);
    } else {
      console.error('Elemento del modal de usuario no encontrado.');
    }
  }

  initUserForm(): void {
    // Usar NonNullableFormBuilder para tipos más estrictos si todos los campos son requeridos inicialmente
    // const fb = inject(NonNullableFormBuilder);
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required], // Considera validaciones de patrones para teléfonos
      image: ['', Validators.required]  // Considera validaciones de patrones para URLs
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.userService.getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef)) // Gestión de suscripción moderna
      .subscribe({
        next: (data) => {
          this.users.set(data);
          this.isLoading.set(false);
          this.cdr.detectChanges(); // Forzar detección de cambios antes de (re)inicializar DataTables
          this.initializeDataTable();
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.users.set([]); // Limpiar usuarios en caso de error
          this.errorMessage.set('Error al cargar usuarios. Por favor, intente más tarde.');
          this.isLoading.set(false);
          this.cdr.detectChanges(); // Asegurar que la UI refleje el estado de error y tabla vacía
          this.initializeDataTable(); // Inicializar DataTables incluso si hay error para mostrar tabla vacía
        }
      });
  }

  initializeDataTable(): void {
    if (this.dataTable) {
      this.dataTable.destroy(); // Destruir instancia previa si existe
    }

    // Usar un pequeño timeout para asegurar que Angular haya renderizado el DOM
    // basado en los datos actualizados (users signal) antes de que jQuery lo manipule.
    setTimeout(() => {
      if (this.usersTable && this.usersTable.nativeElement) {
        const currentUsers = this.users(); // Obtener el valor del signal
        if (currentUsers.length > 0) {
            this.dataTable = $(this.usersTable.nativeElement).DataTable({
                responsive: true,
                // language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' } // Para español
            });
        } else {
            // Si no hay datos, inicializar con configuración para tabla vacía si es necesario
            // o simplemente no inicializar si el HTML ya maneja el mensaje de "no hay datos".
            // Por consistencia, si la tabla existe en el DOM, DataTables puede inicializarse.
            this.dataTable = $(this.usersTable.nativeElement).DataTable({
                responsive: true,
                data: [], // DataTables puede manejar un array vacío
                columns: [ // Definir columnas para que la tabla se renderice correctamente vacía
                    { title: "ID" }, // Cambiado de CODE a ID
                    { title: "Imagen" },
                    { title: "Nombre" },
                    { title: "Email" },
                    { title: "Teléfono" },
                    { title: "Acciones" }
                ],
                // language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' }
            });
        }
      }
    }, 0);
  }

  openAddUserModal(): void {
    this.isEditMode.set(false);
    this.currentUserId.set(null);
    this.userForm.reset();
    this.errorMessage.set(null); // Limpiar errores del modal
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  openEditUserModal(user: User): void {
    if (!user || user.id === undefined) {
      console.error('Intento de editar usuario sin ID:', user);
      this.errorMessage.set('No se puede editar el usuario: falta ID.');
      return;
    }
    this.isEditMode.set(true);
    this.currentUserId.set(user.id);
    this.errorMessage.set(null);
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image
    });
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  onSubmitUserForm(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched(); // Mostrar errores de validación
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const formData = this.userForm.getRawValue(); // Usar getRawValue para obtener todos los valores

    const operation$ = this.isEditMode() && this.currentUserId() !== null
      ? this.userService.updateUser(this.currentUserId()!, formData) // El '!' es seguro por la condición
      : this.userService.createUser(formData); // Asumiendo que createUser espera el mismo formato

    operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isLoading.set(false);
        const successMessage = this.isEditMode()
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.';
        this.showSuccessNotification(successMessage); // Usar un método de notificación
        this.loadUsers(); // <--- REFRESH AUTOMÁTICO DE DATOS
        if (this.modalInstance) this.modalInstance.hide();
      },
      error: (err) => {
        console.error(`Error al ${this.isEditMode() ? 'actualizar' : 'crear'} usuario:`, err);
        // Formatear mensaje de error de la API si está disponible
        const apiError = err.error?.message || (err.error?.errors ? JSON.stringify(err.error.errors) : err.message);
        this.errorMessage.set(`Error: ${apiError || 'Ocurrió un problema.'}`);
        this.isLoading.set(false);
      }
    });
  }

  onDeleteUser(userId: number | undefined): void {
    if (userId === undefined) {
      console.error('Intento de eliminar usuario sin ID.');
      this.showErrorNotification('No se puede eliminar el usuario: falta ID.');
      return;
    }

    // Considerar un servicio de confirmación más elegante (ej. SweetAlert2)
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.isLoading.set(true);
      this.errorMessage.set(null); // Limpiar error general antes de la operación
      this.userService.deleteUser(userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isLoading.set(false);
            this.showSuccessNotification('Usuario eliminado correctamente.');
            this.loadUsers(); // <--- REFRESH AUTOMÁTICO DE DATOS
          },
          error: (err) => {
            console.error('Error al eliminar usuario:', err);
            const apiError = err.error?.message || err.message;
            this.showErrorNotification(`Error al eliminar usuario: ${apiError || 'Ocurrió un problema.'}`);
            this.isLoading.set(false);
          }
        });
    }
  }

  // Métodos de notificación (podrían ser reemplazados por un servicio de Toast/Snackbar)
  private showSuccessNotification(message: string): void {
    alert(message); // Placeholder, reemplazar con un sistema de notificaciones real
    console.log('Success:', message);
  }

  private showErrorNotification(message: string): void {
    // El errorMessage signal se usa para errores dentro del modal o errores generales de carga.
    // Este método es para notificaciones de error más directas tras una acción.
    alert(message); // Placeholder
    console.error('Error Notification:', message);
  }

  // Getter para acceder fácilmente a los controles del formulario en la plantilla (si aún se usa con ngClass)
  get f(): { [key: string]: AbstractControl } {
    return this.userForm.controls;
  }

  ngOnDestroy(): void {
    // takeUntilDestroyed maneja la desuscripción automáticamente.
    // Limpieza manual de recursos no gestionados por Angular:
    if (this.dataTable) {
      this.dataTable.destroy();
    }
    if (this.modalInstance) {
      // Bootstrap 5 modals se supone que se limpian solos, pero por si acaso:
      this.modalInstance.hide(); // Asegurarse de que esté oculto
      // Bootstrap 5 no tiene un método 'dispose' como BS4 para removerlo completamente del DOM programáticamente de forma sencilla.
      // La remoción del backdrop se maneja usualmente por Bootstrap.
    }
  }
}
