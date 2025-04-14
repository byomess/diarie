import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { FiHome, FiCheckSquare, FiSearch, FiSquare, FiPlus, FiTrash, FiEdit, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import useLocalStorage from './hooks/useLocalStorage';

import logoIcon from './assets/diarie_logo_icon.png';
import logoText from './assets/diarie_logo_text.png';
import { useSounds } from './hooks/useSounds';

const PRIMARY_APP_COLOR = '#bd92e8';
const PRIMARY_APP_HOVER_COLOR = '#a67ed1'; // Slightly darker hover for the primary color
const TEXT_PRIMARY = '#374151';
const TEXT_SECONDARY = '#6B7280';
const BACKGROUND_GRADIENT_FROM = 'from-purple-100'; // Adjusted gradient
const BACKGROUND_VIA = 'via-amber-100/20'; // Adjusted gradient
const BACKGROUND_GRADIENT_TO = 'to-blue-100'; // Adjusted gradient

const BORDER_COLOR_DEFAULT = 'border-gray-200';
const BORDER_DONE_COLOR = '#E5E7EB';
const RING_FOCUS_COLOR_PRIMARY = 'focus:ring-purple-200';
const RING_FOCUS_COLOR_SECONDARY = 'focus:ring-gray-400';
const RING_FOCUS_SIZE = 'focus:ring-2';
const BORDER_FOCUS_COLOR_PRIMARY = 'focus:border-purple-500';

const LOCAL_STORAGE_TASKS_KEY = 'tasks_v1';

interface Task {
  id: number;
  title: string;
  time: string;
  date: string;
  accentColorHex: string;
  darkTextColorHex: string;
  done: boolean;
}

const getContrastingTextColor = (hexColor: string): string => {
  hexColor = hexColor.replace('#', '');
  if (hexColor.length === 3) {
    hexColor = hexColor.split('').map(char => char + char).join('');
  }
  if (hexColor.length !== 6) {
    return '#374151';
  }
  try {
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance > 140 ? '#374151' : '#FFFFFF';
  } catch (e) {
    console.error("Error parsing hex color:", hexColor, e);
    return '#374151';
  }
};

const pastelSuggestionPalette = [
  { accentColorHex: '#FFDAB9', darkTextColorHex: '#A0522D' },
  { accentColorHex: '#E6E6FA', darkTextColorHex: '#6A5ACD' },
  { accentColorHex: '#AFEEEE', darkTextColorHex: '#20B2AA' },
  { accentColorHex: '#F0FFF0', darkTextColorHex: '#2E8B57' },
  { accentColorHex: '#FFFACD', darkTextColorHex: '#B8860B' },
  { accentColorHex: '#FFC0CB', darkTextColorHex: '#C71585' },
  { accentColorHex: '#D8BFD8', darkTextColorHex: '#8A2BE2' },
  { accentColorHex: '#ADD8E6', darkTextColorHex: '#4682B4' },
  { accentColorHex: '#98FB98', darkTextColorHex: '#3CB371' },
  { accentColorHex: '#F5F5DC', darkTextColorHex: '#8B4513' },
  { accentColorHex: '#FFE4E1', darkTextColorHex: '#CD5C5C' },
  { accentColorHex: '#FAFAD2', darkTextColorHex: '#BDB76B' },
  { accentColorHex: '#B0E0E6', darkTextColorHex: '#5F9EA0' },
  { accentColorHex: '#FFEFD5', darkTextColorHex: '#D2691E' },
];

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface TaskContextType {
  tasks: Task[];
  toggleTaskDone: (id: number) => void;
  addTask: (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => void;
  editTask: (id: number, title: string, time: string, date: string, color?: { accentColorHex: string; darkTextColorHex: string }) => void;
  removeTask: (id: number) => void;
  reorderTasks: (id: number, direction: 'up' | 'down') => void; // Added reorder function
}

interface UiContextType {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { playSound } = useSounds(true);
  const today = getTodayDateString();
  const [tasks, setTasks] = useLocalStorage<Task[]>(LOCAL_STORAGE_TASKS_KEY, [
    { id: 1, title: 'Trocar areia dos gatos', time: '08:00', date: today, ...pastelSuggestionPalette[0], done: false },
    { id: 2, title: 'Colocar água e ração para os gatos', time: '09:30', date: today, ...pastelSuggestionPalette[7], done: false },
    { id: 3, title: "Limpar nariz da Belinha", time: '11:00', date: today, ...pastelSuggestionPalette[6], done: false },
    { id: 4, title: 'Varrer os cômodos', time: '13:00', date: today, ...pastelSuggestionPalette[8], done: false },
    { id: 5, title: "Passar pano", time: '14:00', date: today, ...pastelSuggestionPalette[4], done: true },
  ]);

  const addTask = (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => {
    playSound('createTask');
    const newTask: Task = {
      id: Date.now(),
      title,
      time,
      date,
      accentColorHex: color.accentColorHex,
      darkTextColorHex: color.darkTextColorHex,
      done: false,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const toggleTaskDone = (id: number) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          playSound(task.done ? 'taskUndone' : 'taskDone');
          return {
            ...task,
            done: !task.done,
          };
        }
        return task;
      })
    );
  };

  const editTask = (id: number, title: string, time: string, date: string, color?: { accentColorHex: string; darkTextColorHex: string }) => {
    playSound('createTask');
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? {
          ...task,
          title,
          time,
          date,
          accentColorHex: color ? color.accentColorHex : task.accentColorHex,
          darkTextColorHex: color ? color.darkTextColorHex : task.darkTextColorHex,
        } : task
      )
    );
  };

  const removeTask = (id: number) => {
    playSound('deleteTask');
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const reorderTasks = (id: number, direction: 'up' | 'down') => {
    playSound('reorderTask');
    setTasks((prevTasks) => {
      const index = prevTasks.findIndex(task => task.id === id);
      if (index === -1) return prevTasks; // Task not found

      const newIndex = direction === 'up' ? index - 1 : index + 1;

      // Check boundaries
      if (newIndex < 0 || newIndex >= prevTasks.length) {
        return prevTasks; // Cannot move further
      }

      const newTasks = [...prevTasks];
      const [movedTask] = newTasks.splice(index, 1); // Remove task from original position
      newTasks.splice(newIndex, 0, movedTask); // Insert task at new position

      return newTasks;
    });
  };

  return (
    <TaskContext.Provider value={{ tasks, toggleTaskDone, addTask, editTask, removeTask, reorderTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within a TaskProvider');
  return context;
};

const UiContext = createContext<UiContextType | undefined>(undefined);

const UiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('Tasks');
  return (
    <UiContext.Provider value={{ currentTab, setCurrentTab }}>
      {children}
    </UiContext.Provider>
  );
};

const useUi = () => {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used within a UiProvider');
  return context;
};

interface CustomCheckboxProps {
  checked: boolean;
  accentColor: string;
  textColor: string;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, accentColor, textColor }) => {
  const bgColor = checked ? accentColor : '#FFFFFF';
  const borderColor = checked ? accentColor : BORDER_DONE_COLOR;

  return (
    <div
      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ease-in-out flex-shrink-0 cursor-pointer ml-[2px]`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        boxShadow: checked ? `0 0 0 2px ${accentColor}66` : 'none'
      }}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <motion.svg
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke={textColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </motion.svg>
      )}
    </div>
  );
};

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => void;
  initialData?: Task | null;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.90, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2, ease: "easeOut" }
  },
};

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [selectedColor, setSelectedColor] = useState<{ accentColorHex: string; darkTextColorHex: string }>(
    initialData
      ? { accentColorHex: initialData.accentColorHex, darkTextColorHex: initialData.darkTextColorHex }
      : pastelSuggestionPalette[Math.floor(Math.random() * pastelSuggestionPalette.length)]
  );
  const modalContentRef = useRef<HTMLDivElement>(null);

  const { playSound } = useSounds(true);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setTime(initialData.time);
        setDate(initialData.date || getTodayDateString());
        setSelectedColor({ accentColorHex: initialData.accentColorHex, darkTextColorHex: initialData.darkTextColorHex });
      } else {
        setTitle('');
        setTime('');
        setDate(getTodayDateString());
        setSelectedColor(pastelSuggestionPalette[Math.floor(Math.random() * pastelSuggestionPalette.length)]);
      }
      setTimeout(() => {
        document.getElementById('taskTitle')?.focus();
      }, 100);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSuggestionClick = (color: { accentColorHex: string; darkTextColorHex: string }) => {
    setSelectedColor(color);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title, time, date, selectedColor);
      // onClose();
    } else {
      alert("O título da tarefa não pode estar vazio!");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/40 backdrop-blur-sm"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.div
        ref={modalContentRef}
        className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl w-full max-w-lg mx-auto"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center mb-6 pb-4 border-b ${BORDER_COLOR_DEFAULT}`}>
          <h2 className="text-xl font-semibold" style={{ color: TEXT_PRIMARY }}>
            {initialData ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors rounded-full p-1 -mr-2"
            aria-label="Fechar Modal"
          >
            <FiX size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-600 mb-1">
              Título da Tarefa <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="taskTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
              style={{ color: TEXT_PRIMARY }}
              placeholder="Ex: Comprar chá e biscoitos"
              onFocus={() => playSound('focus')}
              required
            />
          </div>
          <div className='flex flex-col sm:flex-row sm:space-x-4 space-y-5 sm:space-y-0'>
            <div className="flex-1">
              <label htmlFor="taskDate" className="block text-sm font-medium text-gray-600 mb-1">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                id="taskDate"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
                style={{ color: TEXT_PRIMARY }}
                onFocus={() => playSound('focus')}
                required
              />
            </div>
            <div className="flex-1">
              <label htmlFor="taskTime" className="block text-sm font-medium text-gray-600 mb-1">
                Horário <span className='text-gray-400 text-xs'>(Opcional)</span>
              </label>
              <input
                type="time"
                id="taskTime"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
                style={{ color: TEXT_PRIMARY }}
                onFocus={() => playSound('focus')}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Cor da Tarefa
            </label>
            <div className="overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full">
              <div className="flex items-center space-x-2 py-1 w-max pr-2">
                {pastelSuggestionPalette.map((color) => (
                  <button
                    key={color.accentColorHex}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none border-gray-100 ${selectedColor.accentColorHex === color.accentColorHex ? `${RING_FOCUS_SIZE} ring-offset-2 ${RING_FOCUS_COLOR_SECONDARY}` : ' hover:border-gray-400'}`}
                    style={{ backgroundColor: color.accentColorHex }}
                    onClick={() => handleSuggestionClick(color)}
                    aria-label={`Selecionar cor ${color.accentColorHex}`}
                    onFocus={() => playSound('focus')}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className={`flex justify-end space-x-3 pt-4 border-t ${BORDER_COLOR_DEFAULT} mt-6`}>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-150 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: selectedColor.accentColorHex, color: selectedColor.darkTextColorHex }}
              className={`px-5 py-2.5 rounded-lg transition-all duration-150 font-medium shadow-sm hover:shadow-md hover:brightness-105`}
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar Tarefa'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const MainScreen: React.FC = () => {
  const { tasks, toggleTaskDone, addTask, editTask, removeTask, reorderTasks } = useTasks();
  const { currentTab, setCurrentTab } = useUi();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showActionsTaskId, setShowActionsTaskId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { playSound } = useSounds(true);

  const activeColor = PRIMARY_APP_COLOR;
  const inactiveColor = '#A0AEC0';

  const handleOpenModalForAdd = () => {
    playSound('modalOpen');
    setEditingTask(null);
    setShowActionsTaskId(null);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (task: Task) => {
    playSound('modalOpen');
    setEditingTask(task);
    setShowActionsTaskId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    playSound('modalClose');
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleModalSubmit = (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => {
    if (editingTask) {
      editTask(editingTask.id, title, time, date, color);
    } else {
      addTask(title, time, date, color);
    }
    setTimeout(() => handleCloseModal(), 500);
  };

  const handleDeleteTask = (id: number) => {
    playSound('deleteTask');
    removeTask(id);
    setShowActionsTaskId(null);
  };

  const handleReorderTask = (taskId: number, direction: 'up' | 'down') => {
    playSound('reorderTask');
    reorderTasks(taskId, direction);
    // Keep the action menu open for the moved item
    // setShowActionsTaskId(null); // Optional: close menu after reorder
  };


  const handlePointerDown = (taskId: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (showActionsTaskId !== taskId) {
      longPressTimer.current = setTimeout(() => {
        setShowActionsTaskId(taskId);
        longPressTimer.current = null;
      }, 500);
    }
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleItemClick = (task: Task) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      toggleTaskDone(task.id);
      setShowActionsTaskId(null);
    } else if (showActionsTaskId === task.id) {
      setShowActionsTaskId(null);
    } else {
      toggleTaskDone(task.id);
    }
  };

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('[data-task-item]') && !target.closest('[data-task-actions]')) {
      setShowActionsTaskId(null);
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  }

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleFocusSearch = () => {
    searchInputRef.current?.focus();
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return dateString;
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br ${BACKGROUND_GRADIENT_FROM} ${BACKGROUND_VIA} ${BACKGROUND_GRADIENT_TO} font-sans relative pb-32 overflow-x-hidden`} onContextMenu={handleContextMenu}>
      {/* <div className={`min-h-screen bg-gradient-to-br ${BACKGROUND_GRADIENT_FROM} ${BACKGROUND_VIA} ${BACKGROUND_GRADIENT_TO} font-sans relative pb-32 overflow-x-hidden`} onContextMenu={handleContextMenu}></div> */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-center pt-10 pb-8">
          {/* <h1 className="text-4xl font-bold tracking-tight" style={{ color: PRIMARY_APP_COLOR, fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
            Diariê
          </h1> */}
          <div className="flex items-center space-x-2">
            <img
              src={logoIcon}
              alt="Logo Ícone Diariê"
              className="w-[64px] mx-auto mb-2"
              width={128}
              height={128}
            />
            <img
              src={logoText}
              alt="Logo Texto Diariê"
              className="w-32 mx-auto mb-2"
            // style={{ filter: `drop-shadow(0 0 10px ${PRIMARY_APP_COLOR})` }}
            />

          </div>
          {/* <p className="text-lg mt-1" style={{color: TEXT_SECONDARY}}>Suas tarefas, em tons suaves.</p> */}
        </header>

        <div className="mb-8 relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar tarefa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 border ${BORDER_COLOR_DEFAULT} rounded-xl focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} ${BORDER_FOCUS_COLOR_PRIMARY} bg-white transition duration-150 ease-in-out`}
            style={{ color: TEXT_PRIMARY, '::placeholder': { color: TEXT_SECONDARY } } as React.CSSProperties}
            onFocus={() => playSound('focus')}
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={22} />
        </div>

        <main>
          <section className={`bg-white mb-8 overflow-hidden rounded-2xl border ${BORDER_COLOR_DEFAULT}`}>
            {!searchTerm && (
              <h2 className={`text-lg font-semibold px-6 pt-5 pb-3 border-b ${BORDER_COLOR_DEFAULT}`} style={{ color: TEXT_PRIMARY }}>
                Tarefas
              </h2>
            )}
            {/* Use Reorder.Group for the list */}
            {/* Note: Reorder typically works best with drag-and-drop, but we'll use buttons */}
            {/* We still use AnimatePresence for add/remove animations */}
            <AnimatePresence initial={false}>
              <div className="divide-y divide-gray-100">
                {filteredTasks.length === 0 ? (
                  <p className="text-center py-10 px-6" style={{ color: TEXT_SECONDARY }}>
                    {tasks.length > 0 ? 'Nenhuma tarefa encontrada com sua busca.' : 'Você ainda não tem tarefas. Que tal adicionar uma?'}
                  </p>
                ) : filteredTasks.map((task, index) => {
                  const getTaskBackgroundColor = () => {
                    const lightAccentAlpha = '33';
                    const doneBgColor = '#F9FAFB';
                    const activeBgColor = '#F1F5F9'; // slate-100

                    if (task.done) return doneBgColor;
                    if (showActionsTaskId === task.id) return activeBgColor;
                    try {
                      if (/^#[0-9A-F]{6}$/i.test(task.accentColorHex)) {
                        return task.accentColorHex + lightAccentAlpha;
                      }
                    } catch { /* ignore */ }
                    return '#FFFFFF' + lightAccentAlpha;
                  };

                  const titleColor = task.done ? TEXT_SECONDARY : task.darkTextColorHex;
                  const dateTimeColor = task.done ? TEXT_SECONDARY : task.darkTextColorHex;
                  const checkTextColor = getContrastingTextColor(task.accentColorHex);

                  const isFirst = index === 0;
                  const isLast = index === filteredTasks.length - 1;

                  return (
                    <motion.div
                      key={task.id}
                      layout // Enable layout animation
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      data-task-item
                      className={`
                        relative flex items-center justify-between px-5 py-4 {/* Standard padding */}
                        transition-colors duration-150 ease-in-out group {/* Removed hover:brightness, use conditional bg */}
                        before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0
                        before:w-1 before:bg-[var(--task-accent-color)] before:transition-colors before:duration-150
                      `}
                      style={{
                        '--task-accent-color': task.done ? BORDER_DONE_COLOR : task.accentColorHex,
                        backgroundColor: getTaskBackgroundColor(),
                      } as React.CSSProperties}
                      onPointerDown={() => handlePointerDown(task.id)}
                      onPointerUp={handlePointerUpOrLeave}
                      onPointerLeave={handlePointerUpOrLeave}
                      onClick={() => handleItemClick(task)}
                    >
                      {/* Content Area - No conditional margin/padding */}
                      <div className="flex items-center space-x-4 flex-grow overflow-hidden">
                        <CustomCheckbox
                          checked={task.done}
                          accentColor={task.accentColorHex}
                          textColor={checkTextColor}
                        />
                        <div className="flex-1 min-w-0"> {/* Allow text container to shrink/grow */}
                          <p
                            className={`text-base font-medium break-words ${task.done ? 'line-through' : ''}`}
                            style={{ color: titleColor, textDecorationColor: task.done ? BORDER_DONE_COLOR : 'transparent' }}
                          >
                            {task.title}
                          </p>
                          {(task.date || task.time) && (
                            <div className="flex items-center space-x-2 mt-1">
                              <p
                                className={`text-xs ${task.done ? 'line-through' : ''}`}
                                style={{
                                  color: dateTimeColor,
                                  opacity: task.done ? 0.7 : 0.9,
                                  textDecorationColor: task.done ? BORDER_DONE_COLOR : 'transparent'
                                }}
                              >
                                {task.date && formatDateDisplay(task.date)}
                                {task.date && task.time && ' • '}
                                {task.time}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions Menu - Positioned absolutely to overlap */}
                      <AnimatePresence>
                        {showActionsTaskId === task.id && (
                          <motion.div
                            data-task-actions
                            initial={{ opacity: 0, scale: 0.8, x: 10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: 10 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            // Absolute positioning is key for overlap
                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1 bg-white p-1.5 rounded-lg border ${BORDER_COLOR_DEFAULT} shadow-md z-20`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleReorderTask(task.id, 'up')}
                              disabled={isFirst}
                              className={`p-2 rounded-md transition-colors ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                              aria-label="Mover para cima"
                              title="Mover para cima"
                            > <FiArrowUp size={18} /> </button>
                            <button
                              onClick={() => handleReorderTask(task.id, 'down')}
                              disabled={isLast}
                              className={`p-2 rounded-md transition-colors ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                              aria-label="Mover para baixo"
                              title="Mover para baixo"
                            > <FiArrowDown size={18} /> </button>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div> {/* Separator */}
                            <button
                              onClick={() => handleOpenModalForEdit(task)}
                              className="p-2 text-blue-500 hover:text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
                              aria-label="Editar Tarefa"
                              title="Editar Tarefa"
                            > <FiEdit size={18} /> </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                              aria-label="Excluir Tarefa"
                              title="Excluir Tarefa"
                            > <FiTrash size={18} /> </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          </section>
        </main>

        <div className="fixed bottom-24 right-4 sm:right-6 lg:right-8 flex flex-col space-y-3 z-10">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFocusSearch}
            className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-lg hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
            style={{ color: PRIMARY_APP_COLOR }}
            aria-label="Focar na Busca"
            title="Focar na Busca"
          >
            <FiSearch size={24} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenModalForAdd}
            style={{ backgroundColor: PRIMARY_APP_COLOR, color: 'white' }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:bg-[${PRIMARY_APP_HOVER_COLOR}] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${PRIMARY_APP_COLOR}]`}
            aria-label="Adicionar Nova Tarefa"
            title="Adicionar Nova Tarefa"
          >
            <FiPlus size={28} />
          </motion.button>
        </div>

        <nav className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t ${BORDER_COLOR_DEFAULT} z-10`}>
          <div className="max-w-md mx-auto flex justify-around items-center h-16">
            {[
              { name: 'Home', icon: FiHome },
              { name: 'Tasks', icon: FiCheckSquare },
              { name: 'Search', icon: FiSearch },
              { name: 'Calendar', icon: FiSquare },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setCurrentTab(item.name)}
                className="relative flex flex-col items-center justify-center h-full w-16 text-xs font-medium transition-colors duration-200 ease-in-out group focus:outline-none"
                style={{ color: currentTab === item.name ? activeColor : inactiveColor }}
                aria-label={item.name}
              >
                <item.icon size={24} strokeWidth={currentTab === item.name ? 2.5 : 2} />
                {currentTab === item.name && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute bottom-1 w-6 h-1 rounded-full"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>
      <AnimatePresence
        mode="wait"
        onExitComplete={() => setEditingTask(null)}
      >
        {isModalOpen && (
          <TaskModal
            key={editingTask ? `edit-${editingTask.id}` : "add-task-modal"}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSubmit={handleModalSubmit}
            initialData={editingTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <UiProvider>
      <TaskProvider>
        <MainScreen />
      </TaskProvider>
    </UiProvider>
  );
}