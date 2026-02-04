// Task Manager Application
class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.editingTaskId = null;
        this.draggedElement = null;
        
        this.init();
    }

    init() {
        this.renderTasks();
        this.updateStats();
        this.attachEventListeners();
        this.checkDueDates();
        
        // Check due dates every minute
        setInterval(() => this.checkDueDates(), 60000);
    }

    // Local Storage Operations
    loadTasks() {
        const tasks = localStorage.getItem('tasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // Task Operations
    addTask(taskData) {
        const task = {
            id: Date.now().toString(),
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.showNotification('Task added successfully!', 'success');
    }

    updateTask(taskId, taskData) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                title: taskData.title,
                description: taskData.description,
                category: taskData.category,
                priority: taskData.priority,
                dueDate: taskData.dueDate
            };
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task updated successfully!', 'success');
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task deleted successfully!', 'info');
        }
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    // Drag and Drop
    handleDragStart(e, taskId) {
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', taskId);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        if (e.target.classList.contains('task-card')) {
            e.target.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        if (e.target.classList.contains('task-card')) {
            e.target.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        const draggedTaskId = e.dataTransfer.getData('text/html');
        const targetCard = e.target.closest('.task-card');
        
        if (targetCard && this.draggedElement !== targetCard) {
            const targetTaskId = targetCard.dataset.taskId;
            this.reorderTasks(draggedTaskId, targetTaskId);
        }

        return false;
    }

    reorderTasks(draggedId, targetId) {
        const draggedIndex = this.tasks.findIndex(t => t.id === draggedId);
        const targetIndex = this.tasks.findIndex(t => t.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedTask] = this.tasks.splice(draggedIndex, 1);
            this.tasks.splice(targetIndex, 0, draggedTask);
            this.saveTasks();
            this.renderTasks();
        }
    }

    // Filtering and Search
    filterTasks(category) {
        this.currentFilter = category;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });
        
        this.renderTasks();
    }

    searchTasks(query) {
        this.renderTasks(query);
    }

    getFilteredTasks(searchQuery = '') {
        let filtered = this.tasks;

        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(t => t.category === this.currentFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(query) || 
                t.description.toLowerCase().includes(query)
            );
        }

        return filtered;
    }

    // Rendering
    renderTasks(searchQuery = '') {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const filteredTasks = this.getFilteredTasks(searchQuery);

        container.innerHTML = '';

        if (filteredTasks.length === 0) {
            emptyState.classList.add('show');
            container.style.display = 'none';
        } else {
            emptyState.classList.remove('show');
            container.style.display = 'grid';

            filteredTasks.forEach(task => {
                const taskCard = this.createTaskCard(task);
                container.appendChild(taskCard);
            });
        }
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        card.draggable = true;
        card.dataset.taskId = task.id;
        card.setAttribute('data-testid', `task-card-${task.id}`);

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && !task.completed;

        card.innerHTML = `
            <div class="task-header">
                <div class="task-header-left">
                    <input type="checkbox" 
                           class="task-checkbox" 
                           ${task.completed ? 'checked' : ''}
                           data-task-id="${task.id}"
                           data-testid="task-checkbox-${task.id}">
                    <div class="task-info">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                        <div class="task-meta">
                            <span class="task-badge badge-category">
                                <i class="fas fa-${this.getCategoryIcon(task.category)}"></i>
                                ${task.category}
                            </span>
                            <span class="task-badge badge-priority ${task.priority}">
                                ${task.priority} priority
                            </span>
                            ${dueDate ? `
                                <span class="task-due-date ${isOverdue ? 'overdue' : ''}" data-testid="task-due-date-${task.id}">
                                    <i class="fas fa-${isOverdue ? 'exclamation-circle' : 'calendar'}"></i>
                                    ${this.formatDueDate(dueDate)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="icon-btn edit" data-task-id="${task.id}" data-testid="edit-task-${task.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn delete" data-task-id="${task.id}" data-testid="delete-task-${task.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Add drag and drop event listeners
        card.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));
        card.addEventListener('dragover', (e) => this.handleDragOver(e));
        card.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        card.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        card.addEventListener('drop', (e) => this.handleDrop(e));

        return card;
    }

    // Statistics
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('progressPercent').textContent = `${progress}%`;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    // Due Date Reminders
    checkDueDates() {
        const now = new Date();
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        this.tasks.forEach(task => {
            if (!task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                
                // Notify if due within 24 hours
                if (dueDate > now && dueDate <= oneDayFromNow && !task.notified) {
                    this.showNotification(`Reminder: "${task.title}" is due soon!`, 'warning');
                    task.notified = true;
                    this.saveTasks();
                }
                
                // Notify if overdue
                if (dueDate < now && !task.overdueNotified) {
                    this.showNotification(`"${task.title}" is overdue!`, 'error');
                    task.overdueNotified = true;
                    this.saveTasks();
                }
            }
        });
    }

    // Modal Operations
    openModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('taskForm');

        this.editingTaskId = taskId;

        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                modalTitle.textContent = 'Edit Task';
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskCategory').value = task.category;
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskDueDate').value = task.dueDate || '';
            }
        } else {
            modalTitle.textContent = 'Add New Task';
            form.reset();
        }

        modal.classList.add('show');
    }

    closeModal() {
        const modal = document.getElementById('taskModal');
        modal.classList.remove('show');
        this.editingTaskId = null;
        document.getElementById('taskForm').reset();
    }

    // Event Listeners
    attachEventListeners() {
        // Add Task Button
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Close Modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') {
                this.closeModal();
            }
        });

        // Task Form Submit
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const taskData = {
                title: document.getElementById('taskTitle').value,
                description: document.getElementById('taskDescription').value,
                category: document.getElementById('taskCategory').value,
                priority: document.getElementById('taskPriority').value,
                dueDate: document.getElementById('taskDueDate').value
            };

            if (this.editingTaskId) {
                this.updateTask(this.editingTaskId, taskData);
            } else {
                this.addTask(taskData);
            }

            this.closeModal();
        });

        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterTasks(btn.dataset.category);
            });
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTasks(e.target.value);
        });

        // Task Actions (Edit, Delete, Complete) - Event Delegation
        document.getElementById('tasksContainer').addEventListener('click', (e) => {
            const target = e.target.closest('.icon-btn, .task-checkbox');
            
            if (target) {
                const taskId = target.dataset.taskId;
                
                if (target.classList.contains('edit')) {
                    this.openModal(taskId);
                } else if (target.classList.contains('delete')) {
                    this.deleteTask(taskId);
                } else if (target.classList.contains('task-checkbox')) {
                    this.toggleTaskComplete(taskId);
                }
            }
        });
    }

    // Utility Functions
    getCategoryIcon(category) {
        const icons = {
            work: 'briefcase',
            personal: 'user',
            shopping: 'shopping-cart',
            health: 'heartbeat'
        };
        return icons[category] || 'circle';
    }

    formatDueDate(date) {
        const now = new Date();
        const diff = date - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days < 0) {
            return 'Overdue';
        } else if (days === 0) {
            return 'Due today';
        } else if (days === 1) {
            return 'Due tomorrow';
        } else if (days < 7) {
            return `Due in ${days} days`;
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Simple console notification (can be enhanced with toast notifications)
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // You could add a toast notification library here for better UX
        // For now, using browser notifications if available
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Manager', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TaskManager();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});