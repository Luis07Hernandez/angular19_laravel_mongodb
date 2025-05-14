import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  inject,
  signal,
  WritableSignal,
  DestroyRef,
  NgZone,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { data } from 'jquery';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('usersTable') usersTable!: ElementRef<HTMLTableElement>;
  @ViewChild('userModal') userModalElem!: ElementRef<HTMLDivElement>;

  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private ngZone = inject(NgZone); // <--- INYECTAR NgZone

  users: WritableSignal<User[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string | null> = signal(null);
  isEditMode: WritableSignal<boolean> = signal(false);
  currentUserId: WritableSignal<string | null> = signal(null);

  toastSuccessMessage: WritableSignal<string | null> = signal(null);
  toastErrorMessage: WritableSignal<string | null> = signal(null);

  private successToastTimeoutId: any = null;
  private errorToastTimeoutId: any = null;

  userForm!: FormGroup;
  private modalInstance: any;
  private dataTable: any;

  constructor() {
    this.initUserForm();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    if (this.userModalElem?.nativeElement) {
      this.modalInstance = new bootstrap.Modal(
        this.userModalElem.nativeElement
      );
    } else {
      console.error('Elemento del modal de usuario no encontrado.');
    }
  }

  initUserForm(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      image: ['', Validators.required],
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.userService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.users.set(data);
          this.isLoading.set(false);
          this.cdr.detectChanges();
          this.initializeDataTable();
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.users.set([]);
          this.errorMessage.set(
            'Error al cargar usuarios. Por favor, intente más tarde.'
          );
          this.isLoading.set(false);
          this.cdr.detectChanges();
          this.initializeDataTable(); // Para mostrar tabla vacía con mensaje de DataTables
        },
      });
  }

  initializeDataTable(): void {
    if (this.dataTable) {
      this.dataTable.destroy();
      this.dataTable = null; // Asegurar que se reinicialice
    }

    if (!this.usersTable || !this.usersTable.nativeElement) {
        // Si la tabla aún no está en el DOM (por ejemplo, si @if (isLoading()) la oculta completamente)
        // entonces no podemos inicializar DataTables.
        // Asegúrate que el elemento <table> siempre exista en el DOM cuando esta función es llamada.
        // El @if actual en tu HTML es: @if (!isLoading()) { ...table... }
        // Si isLoading es true, la tabla no existe.
        // Modificaremos loadUsers y el HTML para manejar esto.
      console.warn('usersTable nativeElement no disponible. Retrasando inicialización de DataTable o revisa el @if.');
      // Una opción es llamar initializeDataTable solo cuando !isLoading() en el HTML mediante alguna directiva o
      // asegurar que loadUsers lo llame en el momento adecuado post-carga.
      // La lógica actual de llamarlo en el next y error de loadUsers es mayormente correcta
      // siempre que el <table> esté renderizado.
      if (this.isLoading()) return; // No intentes inicializar si está cargando y la tabla no existe
    }


    const tableNode = this.usersTable.nativeElement;

    this.dataTable = $(tableNode).DataTable({
      responsive: true,
      data: this.users(), // Obtener datos del signal
      columns: [
        { title: 'Codigo de Usuario', data: 'code' },
        { title: 'Nombre', data: 'name' },
        { title: 'Email', data: 'email' },
        {
            title: 'Fecha de Creación',
            data: 'created_at',
            render: (data: string | null) => {
                if (!data) return '';
                try {
                    // Formatear la fecha. Ajusta según el formato de tu fecha.
                    return new Date(data).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
                } catch (e) {
                    return data; // Devolver el dato original si no se puede parsear
                }
            }
        },
        {
            title: 'Acciones',
            data: null, // No se basa en un campo de datos específico
            orderable: false,
            searchable: false,
            render: (data: any, type: any, row: User) => {
                // Usamos row.id que debería ser el identificador único del usuario
                return `
                    <button class="btn btn-sm btn-warning me-2 edit-user-btn" data-user-id="${row.id}" title="Editar">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-user-btn" data-user-id="${row.id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
            }
        }
      ],
      language: {
          emptyTable: "No hay usuarios para mostrar.",
          loadingRecords: "Cargando...",
          processing: "Procesando...",
          zeroRecords: "No se encontraron resultados",
          infoEmpty: "Mostrando 0 de 0 entradas",
          infoFiltered: "(filtrado de _MAX_ entradas totales)",
          info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
          paginate: {
            first: "Primero",
            last: "Último",
            next: "Siguiente",
            previous: "Anterior"
          },
      },
      destroy: true, // Importante para reinicializar correctamente
      // Callback para adjuntar listeners después de cada dibujado de la tabla (paginación, etc.)
      drawCallback: () => {
        this.ngZone.run(() => { // Asegurar que estamos en la zona de Angular para los listeners
          this.attachActionListeners();
        });
      }
    });
  }

  private attachActionListeners(): void {
    const tableNode = this.usersTable.nativeElement;

    // Remover listeners previos para evitar duplicados
    $(tableNode).off('click', '.edit-user-btn').on('click', '.edit-user-btn', (event: JQuery.ClickEvent) => {
        const userId = $(event.currentTarget).data('user-id');
        // Convertir a string si es necesario o manejar tipos consistentemente
        const userToEdit = this.users().find(u => String(u.id) === String(userId));
        if (userToEdit) {
            this.ngZone.run(() => { // Correr dentro de la zona de Angular
                this.openEditUserModal(userToEdit);
            });
        } else {
            console.warn('Usuario no encontrado para editar:', userId);
        }
    });

    $(tableNode).off('click', '.delete-user-btn').on('click', '.delete-user-btn', (event: JQuery.ClickEvent) => {
        const userId = $(event.currentTarget).data('user-id');

        // El método onDeleteUser espera string | undefined
        const idToDelete = typeof userId === 'string' ? userId : String(userId);

        if (idToDelete !== undefined && idToDelete !== null) {
            this.ngZone.run(() => { // Correr dentro de la zona de Angular
                // Si onDeleteUser espera un número y tu ID es string, necesitarás convertirlo o ajustar el tipo
                this.onDeleteUser(idToDelete); // Ajusta el 'as any' si es necesario
            });
        } else {
            console.warn('ID de usuario no válido para eliminar:', userId);
        }
    });
  }

  // Helper para escapar HTML en atributos si es necesario (ej. en alt de imagen)
  private escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }


  openAddUserModal(): void {
    this.isEditMode.set(false);
    this.currentUserId.set(null);
    this.userForm.reset();
    this.errorMessage.set(null);
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  openEditUserModal(user: User): void {
    if (!user || user.id === undefined) {
      console.error('Intento de editar usuario sin ID o usuario nulo:', user);
      this.errorMessage.set('No se puede editar el usuario: falta ID o datos.');
      return;
    }
    this.isEditMode.set(true);
    this.currentUserId.set(user.id);
    this.errorMessage.set(null);
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
    });
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  onSubmitUserForm(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const formData = this.userForm.getRawValue();
    const currentId = this.currentUserId();

    const operation$ =
      this.isEditMode() && currentId !== null
        ? this.userService.updateUser(currentId, formData)
        : this.userService.createUser(formData);

    operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isLoading.set(false);
        const successMessage = this.isEditMode()
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.';
        this.showSuccessNotification(successMessage);
        this.loadUsers(); // Refresca los datos y reinicializa DataTable
        if (this.modalInstance) this.modalInstance.hide();
      },
      error: (err) => {
        console.error(
          `Error al ${this.isEditMode() ? 'actualizar' : 'crear'} usuario:`,
          err
        );
        const apiError =
          err.error?.message ||
          (err.error?.errors ? JSON.stringify(err.error.errors) : err.message);
        this.errorMessage.set(`Error: ${apiError || 'Ocurrió un problema.'}`);
        this.isLoading.set(false);
      },
    });
  }

  // Ajusta el tipo de userId si tus IDs son strings (ej. MongoDB _id)
  onDeleteUser(userId: number | string | undefined): void {
    if (userId === undefined) {
      console.error('Intento de eliminar usuario sin ID.');
      this.showErrorNotification('No se puede eliminar el usuario: falta ID.');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      // Si userService.deleteUser espera un número, y tu ID es string, convierte
      // const idToDelete = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      // if (isNaN(idToDelete as number)) { ... error ... }
      this.userService
        .deleteUser(userId as any) // Ajusta 'as any' o convierte el tipo según tu servicio
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isLoading.set(false);
            this.showSuccessNotification('Usuario eliminado correctamente.');
            this.loadUsers(); // Refresca los datos y reinicializa DataTable
          },
          error: (err) => {
            console.error('Error al eliminar usuario:', err);
            const apiError = err.error?.message || err.message;
            this.showErrorNotification(
              `Error al eliminar usuario: ${apiError || 'Ocurrió un problema.'}`
            );
            this.isLoading.set(false);
          },
        });
    }
  }

private showSuccessNotification(message: string): void {
    // Limpiar cualquier mensaje de error y su timeout
    if (this.errorToastTimeoutId) {
      clearTimeout(this.errorToastTimeoutId);
      this.errorToastTimeoutId = null;
    }
    this.toastErrorMessage.set(null);

    // Establecer el mensaje de éxito
    this.toastSuccessMessage.set(message);

    // Limpiar timeout de éxito previo si existe
    if (this.successToastTimeoutId) {
      clearTimeout(this.successToastTimeoutId);
    }

    // Configurar nuevo timeout para ocultar el mensaje de éxito
    this.successToastTimeoutId = setTimeout(() => {
      this.toastSuccessMessage.set(null);
      this.successToastTimeoutId = null;
    }, 5000); // Ocultar después de 5 segundos (ajusta según necesites)
  }

  private showErrorNotification(message: string): void {
    // Limpiar cualquier mensaje de éxito y su timeout
    if (this.successToastTimeoutId) {
      clearTimeout(this.successToastTimeoutId);
      this.successToastTimeoutId = null;
    }
    this.toastSuccessMessage.set(null);

    // Establecer el mensaje de error
    this.toastErrorMessage.set(message);

    // Limpiar timeout de error previo si existe
    if (this.errorToastTimeoutId) {
      clearTimeout(this.errorToastTimeoutId);
    }

    // Configurar nuevo timeout para ocultar el mensaje de error
    this.errorToastTimeoutId = setTimeout(() => {
      this.toastErrorMessage.set(null);
      this.errorToastTimeoutId = null;
    }, 7000); // Ocultar después de 7 segundos (errores pueden requerir más tiempo)
  }

  get f(): { [key: string]: AbstractControl } {
    return this.userForm.controls;
  }

  ngOnDestroy(): void {

    if (this.successToastTimeoutId) {
      clearTimeout(this.successToastTimeoutId);
    }
    if (this.errorToastTimeoutId) {
      clearTimeout(this.errorToastTimeoutId);
    }

    if (this.dataTable) {
      this.dataTable.destroy();
      this.dataTable = null;
    }

    if (this.modalInstance && typeof this.modalInstance.hide === 'function') {
        try {
            this.modalInstance.hide();
        } catch (e) {
            console.warn("Error al ocultar modal en ngOnDestroy:", e);
        }
    }
    // takeUntilDestroyed maneja la desuscripción de observables de RxJS
  }
}
