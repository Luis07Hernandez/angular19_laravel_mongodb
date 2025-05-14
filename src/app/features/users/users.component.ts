import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms'; // Importa ReactiveFormsModule
import { CommonModule } from '@angular/common'; // Importa CommonModule
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-users',
  standalone: true, // Confirmado que es standalone
  imports: [
    CommonModule,        // <--- AÑADE ESTO para *ngIf, *ngFor, ngClass, etc.
    ReactiveFormsModule  // <--- AÑADE ESTO para formGroup, formControlName, etc.
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('usersTable') usersTable!: ElementRef;
  @ViewChild('userModal') userModal!: ElementRef;

  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  users: User[] = [];
  userForm!: FormGroup;
  isEditMode = false;
  currentUserId: number | null = null;
  private modalInstance: any;

  private destroy$ = new Subject<void>();
  private dataTable: any;

  isLoading = false;
  errorMessage: string | null = null;

  constructor() {
    this.initUserForm();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    if (this.userModal && this.userModal.nativeElement) {
        this.modalInstance = new bootstrap.Modal(this.userModal.nativeElement);
    } else {
        console.error('User modal element not found.');
    }
  }

  initUserForm(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      image: ['', Validators.required]
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.users = data;
          this.isLoading = false;
          this.cdr.detectChanges();
          this.initializeDataTable();
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.errorMessage = 'Error al cargar usuarios. Intente más tarde.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  initializeDataTable(): void {
    if (this.dataTable) {
      this.dataTable.destroy();
    }
    setTimeout(() => {
      if (this.usersTable && this.usersTable.nativeElement && this.users.length > 0) {
        this.dataTable = $(this.usersTable.nativeElement).DataTable({
          responsive: true,
          // language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' }
        });
      } else if (this.users.length === 0 && this.usersTable && this.usersTable.nativeElement) {
         this.dataTable = $(this.usersTable.nativeElement).DataTable({
            responsive: true,
            data: [],
            columns: [
                { title: "ID" },
                { title: "Imagen" },
                { title: "Nombre" },
                { title: "Email" },
                { title: "Teléfono" },
                { title: "Acciones" }
            ]
        });
      }
    }, 0);
  }

  openAddUserModal(): void {
    this.isEditMode = false;
    this.currentUserId = null;
    this.userForm.reset();
    this.errorMessage = null;
    if (this.modalInstance) {
        this.modalInstance.show();
    }
  }

  openEditUserModal(user: User): void {
    if (!user || user.id === undefined) {
        console.error('Intento de editar usuario sin ID:', user);
        this.errorMessage = 'No se puede editar el usuario: falta ID.';
        return;
    }
    this.isEditMode = true;
    this.currentUserId = user.id;
    this.errorMessage = null;
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
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const formData = this.userForm.value;

    if (this.isEditMode && this.currentUserId !== null) {
      this.userService.updateUser(this.currentUserId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.showSuccessMessage('Usuario actualizado correctamente.');
            this.loadUsers();
            if (this.modalInstance) this.modalInstance.hide();
          },
          error: (err) => {
            console.error('Error updating user:', err);
            this.errorMessage = `Error al actualizar usuario: ${err.error?.message || err.message}`;
            this.isLoading = false;
          }
        });
    } else {
      const newUser = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        image: formData.image
      };
      this.userService.createUser(newUser)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.showSuccessMessage('Usuario creado correctamente.');
            this.loadUsers();
            if (this.modalInstance) this.modalInstance.hide();
          },
          error: (err) => {
            console.error('Error creating user:', err);
            this.errorMessage = `Error al crear usuario: ${err.error?.message || (err.error?.errors ? JSON.stringify(err.error.errors) : err.message)}`;
            this.isLoading = false;
          }
        });
    }
  }

  onDeleteUser(userId: number | undefined): void {
    if (userId === undefined) {
      console.error('Intento de eliminar usuario sin ID.');
      this.showErrorMessage('No se puede eliminar el usuario: falta ID.');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      this.isLoading = true;
      this.errorMessage = null;
      this.userService.deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.showSuccessMessage('Usuario eliminado correctamente.');
            this.loadUsers();
          },
          error: (err) => {
            console.error('Error deleting user:', err);
            this.errorMessage = `Error al eliminar usuario: ${err.error?.message || err.message}`;
            this.isLoading = false;
            this.showErrorMessage(this.errorMessage);
          }
        });
    }
  }

  private showSuccessMessage(message: string): void {
    alert(message);
  }

  private showErrorMessage(message: string): void {
    // El errorMessage ya se muestra en el modal o en la página.
    // Si quieres una alerta extra, descomenta la siguiente línea:
    // alert(message);
  }

  get f(): { [key: string]: AbstractControl } {
    return this.userForm.controls;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dataTable) {
      this.dataTable.destroy();
    }
    if (this.modalInstance) {
        this.modalInstance.hide();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }
  }
}
