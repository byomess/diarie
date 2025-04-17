import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from 'react';
import { FiHome, FiCheckSquare, FiSearch, FiSquare, FiPlus, FiTrash, FiEdit, FiX, FiArrowUp, FiArrowDown, FiRepeat } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Importe SEUS hooks - NÃO USE AS IMPLEMENTAÇÕES COMENTADAS NO FINAL
import useLocalStorage from './hooks/useLocalStorage'; // Certifique-se que o caminho está correto
import { useSounds } from './hooks/useSounds';      // Certifique-se que o caminho está correto

// Importe seus assets - Certifique-se que os caminhos estão corretos
import logoIcon from './assets/diarie_logo_icon.png';
import logoText from './assets/diarie_logo_text.png';

// --- Constantes ---
const PRIMARY_APP_COLOR = '#bd92e8';
// const PRIMARY_APP_ACCENT_COLOR = '#9b6de0';
const PRIMARY_APP_HOVER_COLOR = '#a67ed1';
const TEXT_PRIMARY = '#374151'; // gray-700
const TEXT_SECONDARY = '#6B7280'; // gray-500
const BACKGROUND_GRADIENT_FROM = 'from-purple-100';
const BACKGROUND_VIA = 'via-amber-100/20';
const BACKGROUND_GRADIENT_TO = 'to-blue-100';
const BORDER_COLOR_DEFAULT = 'border-gray-200';
const BORDER_DONE_COLOR = '#E5E7EB'; // gray-200
const RING_FOCUS_COLOR_PRIMARY = 'focus:ring-purple-200';
const RING_FOCUS_COLOR_SECONDARY = 'focus:ring-gray-400';
const RING_FOCUS_SIZE = 'focus:ring-2';
const BORDER_FOCUS_COLOR_PRIMARY = 'focus:border-purple-500';
const LOCAL_STORAGE_TASKS_KEY = 'tasks_v2'; // Incremented version for new structure
const LOCAL_STORAGE_COMPLETIONS_KEY = 'task_completions_v1';
const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']; // 0=Seg, 6=Dom

// --- Interfaces ---
interface Task {
  id: number;
  title: string;
  time: string;
  date: string; // YYYY-MM-DD -> Date created or first scheduled for recurring
  accentColorHex: string;
  darkTextColorHex: string;
  done: boolean; // Only relevant for NON-recurring tasks now
  isRecurring: boolean;
  recurringDays: number[]; // Array of day indices (0-6)
}

// Type for storing completion dates of recurring tasks
// { taskId: ['YYYY-MM-DD', 'YYYY-MM-DD'], ... }
type TaskCompletions = Record<number, string[]>;

interface TaskContextType {
  tasks: Task[];
  taskCompletions: TaskCompletions;
  toggleTaskDone: (id: number, dateForCompletion: string) => void; // Date needed for recurring
  addTask: (
    title: string, time: string, date: string,
    color: { accentColorHex: string; darkTextColorHex: string },
    isRecurring: boolean, recurringDays: number[]
  ) => void;
  editTask: (
    id: number, title: string, time: string, date: string,
    color: { accentColorHex: string; darkTextColorHex: string },
    isRecurring: boolean, recurringDays: number[]
  ) => void;
  removeTask: (id: number) => void;
  reorderTasks: (id: number, direction: 'up' | 'down') => void;
}

interface UiContextType {
  currentBottomTab: string;
  setCurrentBottomTab: (tab: string) => void;
  selectedDayIndex: number; // 0 = Monday, 6 = Sunday
  setSelectedDayIndex: (index: number) => void;
}

// --- Funções Auxiliares ---
const getContrastingTextColor = (hexColor: string): string => {
  hexColor = hexColor.replace('#', '');
  if (hexColor.length === 3) {
    hexColor = hexColor.split('').map(char => char + char).join('');
  }
  if (hexColor.length !== 6) return '#374151';
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
  { accentColorHex: '#FFCCCC', darkTextColorHex: '#720000' },
  { accentColorHex: '#FFD2CC', darkTextColorHex: '#720D00' },
  { accentColorHex: '#FFD8CC', darkTextColorHex: '#721B00' },
  { accentColorHex: '#FFDECC', darkTextColorHex: '#722900' },
  { accentColorHex: '#FFE4CC', darkTextColorHex: '#723700' },
  { accentColorHex: '#FFEACC', darkTextColorHex: '#724400' },
  { accentColorHex: '#FFF0CC', darkTextColorHex: '#725200' },
  { accentColorHex: '#FFF6CC', darkTextColorHex: '#726000' },
  { accentColorHex: '#FFFCCC', darkTextColorHex: '#726E00' },
  { accentColorHex: '#FAFFCC', darkTextColorHex: '#697200' },
  { accentColorHex: '#F4FFCC', darkTextColorHex: '#5B7200' },
  { accentColorHex: '#EEFFCC', darkTextColorHex: '#4E7200' },
  { accentColorHex: '#E8FFCC', darkTextColorHex: '#407200' },
  { accentColorHex: '#E2FFCC', darkTextColorHex: '#327200' },
  { accentColorHex: '#DCFFCC', darkTextColorHex: '#247200' },
  { accentColorHex: '#D6FFCC', darkTextColorHex: '#167200' },
  { accentColorHex: '#D0FFCC', darkTextColorHex: '#097200' },
  { accentColorHex: '#CCFFCE', darkTextColorHex: '#007204' },
  { accentColorHex: '#CCFFD4', darkTextColorHex: '#007212' },
  { accentColorHex: '#CCFFDA', darkTextColorHex: '#007220' },
  { accentColorHex: '#CCFFE0', darkTextColorHex: '#00722D' },
  { accentColorHex: '#CCFFE6', darkTextColorHex: '#00723B' },
  { accentColorHex: '#CCFFEC', darkTextColorHex: '#007249' },
  { accentColorHex: '#CCFFF2', darkTextColorHex: '#007257' },
  { accentColorHex: '#CCFFF8', darkTextColorHex: '#007264' },
  { accentColorHex: '#CCFFFF', darkTextColorHex: '#007272' },
  { accentColorHex: '#CCF8FF', darkTextColorHex: '#006472' },
  { accentColorHex: '#CCF2FF', darkTextColorHex: '#005772' },
  { accentColorHex: '#CCECFF', darkTextColorHex: '#004972' },
  { accentColorHex: '#CCE6FF', darkTextColorHex: '#003B72' },
  { accentColorHex: '#CCE0FF', darkTextColorHex: '#002D72' },
  { accentColorHex: '#CCDAFF', darkTextColorHex: '#002072' },
  { accentColorHex: '#CCD4FF', darkTextColorHex: '#001272' },
  { accentColorHex: '#CCCEFF', darkTextColorHex: '#000472' },
  { accentColorHex: '#D0CCFF', darkTextColorHex: '#090072' },
  { accentColorHex: '#D6CCFF', darkTextColorHex: '#160072' },
  { accentColorHex: '#DCCCFF', darkTextColorHex: '#240072' },
  { accentColorHex: '#E2CCFF', darkTextColorHex: '#320072' },
  { accentColorHex: '#E8CCFF', darkTextColorHex: '#400072' },
  { accentColorHex: '#EECCFF', darkTextColorHex: '#4E0072' },
  { accentColorHex: '#F4CCFF', darkTextColorHex: '#5B0072' },
  { accentColorHex: '#FACCFF', darkTextColorHex: '#690072' },
  { accentColorHex: '#FFCCFC', darkTextColorHex: '#72006E' },
  { accentColorHex: '#FFCCF6', darkTextColorHex: '#720060' },
  { accentColorHex: '#FFCCF0', darkTextColorHex: '#720052' },
  { accentColorHex: '#FFCCEA', darkTextColorHex: '#720044' },
  { accentColorHex: '#FFCCE4', darkTextColorHex: '#720037' },
  { accentColorHex: '#FFCCDE', darkTextColorHex: '#720029' },
  { accentColorHex: '#FFCCD8', darkTextColorHex: '#72001B' },
  { accentColorHex: '#FFCCD2', darkTextColorHex: '#72000D' }
]




// Verify length:
// console.log(pastelSuggestionPalette.length); // Should output 30

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateStringForDayOfWeek = (targetDayIndex: number): string => {
  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7; // Adjust Sunday (0) to 6, Monday (1) to 0
  const diff = targetDayIndex - currentDayIndex;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Contextos ---
const TaskContext = createContext<TaskContextType | undefined>(undefined);
const UiContext = createContext<UiContextType | undefined>(undefined);

// --- Providers ---
const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { playSound } = useSounds(true);
  const today = getTodayDateString();

  // Initialize tasks from local storage, ensuring new fields have defaults
  const [tasks, setTasks] = useLocalStorage<Task[]>(LOCAL_STORAGE_TASKS_KEY, [
    // Dados de exemplo iniciais (adaptados para nova estrutura)
    { id: 1, title: 'Trocar areia dos gatos', time: '08:00', date: today, ...pastelSuggestionPalette[0], done: false, isRecurring: false, recurringDays: [] },
    { id: 2, title: 'Colocar água e ração', time: '09:30', date: today, ...pastelSuggestionPalette[7], done: false, isRecurring: false, recurringDays: [] },
    { id: 3, title: "Limpar nariz da Belinha", time: '11:00', date: today, ...pastelSuggestionPalette[6], done: false, isRecurring: false, recurringDays: [] },
    { id: 4, title: 'Varrer os cômodos', time: '13:00', date: today, ...pastelSuggestionPalette[8], done: false, isRecurring: true, recurringDays: [0, 2, 4] }, // Exemplo recorrente Seg/Qua/Sex
    { id: 5, title: "Passar pano", time: '14:00', date: today, ...pastelSuggestionPalette[4], done: true, isRecurring: false, recurringDays: [] }, // Tarefa feita hoje (não recorrente)
  ]);

  // Initialize task completions from local storage
  const [taskCompletions, setTaskCompletions] = useLocalStorage<TaskCompletions>(LOCAL_STORAGE_COMPLETIONS_KEY, {});

  // Ensure tasks loaded from storage have the new fields
  useEffect(() => {
    setTasks(currentTasks => currentTasks.map(task => ({
      ...task,
      isRecurring: task.isRecurring ?? false,
      recurringDays: task.recurringDays ?? [],
      done: task.isRecurring === false ? (task.done ?? false) : false // Reset 'done' if recurring flag was missing but should be true; ensure non-recurring have 'done'
    })));
    // Clean up completions for tasks that no longer exist
    setTaskCompletions(currentCompletions => {
      const existingTaskIds = new Set(tasks.filter(t => t.isRecurring).map(t => t.id));
      const cleanedCompletions: TaskCompletions = {};
      for (const taskIdStr in currentCompletions) {
        const taskId = parseInt(taskIdStr, 10);
        if (existingTaskIds.has(taskId)) {
          cleanedCompletions[taskId] = currentCompletions[taskId];
        }
      }
      return cleanedCompletions;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  const addTask = (
    title: string, time: string, date: string,
    color: { accentColorHex: string; darkTextColorHex: string },
    isRecurring: boolean, recurringDays: number[]
  ) => {
    playSound('createTask');
    const newTask: Task = {
      id: Date.now(), title, time, date,
      accentColorHex: color.accentColorHex, darkTextColorHex: color.darkTextColorHex,
      done: false, // Always false initially
      isRecurring,
      recurringDays: isRecurring ? recurringDays : [],
    };
    setTasks((prev) => [newTask, ...prev]); // Adiciona no início

    // Initialize completions if recurring
    if (isRecurring) {
      setTaskCompletions(prev => ({ ...prev, [newTask.id]: [] }));
    }
  };

  const toggleTaskDone = (id: number, dateForCompletion: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    playSound(task.done ? 'taskUndone' : 'taskDone'); // Sound might need adjustment based on actual state change

    if (task.isRecurring) {
      setTaskCompletions(prev => {
        const currentCompletions = prev[id] || [];
        const isCompleted = currentCompletions.includes(dateForCompletion);
        let updatedCompletions: string[];

        if (isCompleted) {
          // Mark as undone: remove date
          updatedCompletions = currentCompletions.filter(d => d !== dateForCompletion);
        } else {
          // Mark as done: add date
          updatedCompletions = [...currentCompletions, dateForCompletion];
        }
        return { ...prev, [id]: updatedCompletions };
      });
      // Ensure 'done' is false for recurring tasks in the main task object
      setTasks(prevTasks => prevTasks.map(t => t.id === id ? { ...t, done: false } : t));

    } else {
      // Non-recurring task: toggle the 'done' flag directly
      setTasks(prev =>
        prev.map((t) =>
          t.id === id ? { ...t, done: !t.done } : t
        )
      );
    }
  };

  const editTask = (
    id: number, title: string, time: string, date: string,
    color: { accentColorHex: string; darkTextColorHex: string },
    isRecurring: boolean, recurringDays: number[]
  ) => {
    playSound('createTask'); // ou 'editTask'
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? {
          ...task, title, time, date,
          accentColorHex: color.accentColorHex,
          darkTextColorHex: color.darkTextColorHex,
          isRecurring,
          recurringDays: isRecurring ? recurringDays : [],
          done: isRecurring ? false : task.done, // Reset done if becomes recurring
        } : task
      )
    );

    // Update completions state based on recurrence change
    setTaskCompletions(prev => {
      const existingCompletions = prev[id];
      if (isRecurring && !existingCompletions) {
        // Became recurring, initialize
        return { ...prev, [id]: [] };
      } else if (!isRecurring && existingCompletions) {
        // Became non-recurring, remove completions
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return prev; // No change needed
    });
  };

  const removeTask = (id: number) => {
    playSound('deleteTask');
    const taskToRemove = tasks.find(t => t.id === id);
    setTasks((prev) => prev.filter((task) => task.id !== id));

    // Remove completions if it was a recurring task
    if (taskToRemove && taskToRemove.isRecurring) {
      setTaskCompletions(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const reorderTasks = (id: number, direction: 'up' | 'down') => {
    playSound('reorderTask');
    setTasks((prevTasks) => {
      const index = prevTasks.findIndex(task => task.id === id);
      if (index === -1) return prevTasks;

      // Reordena dentro da lista *global*
      const newIndex = direction === 'up' ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= prevTasks.length) {
        return prevTasks; // Não pode mover além dos limites globais
      }

      const newTasks = [...prevTasks];
      const [movedTask] = newTasks.splice(index, 1);
      newTasks.splice(newIndex, 0, movedTask);
      return newTasks;
    });
  };

  return (
    <TaskContext.Provider value={{ tasks, taskCompletions, toggleTaskDone, addTask, editTask, removeTask, reorderTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

const UiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentBottomTab, setCurrentBottomTab] = useState<string>('Tasks');
  const today = new Date();
  const initialDayIndex = (today.getDay() + 6) % 7; // Mon=0, Sun=6
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialDayIndex);

  return (
    <UiContext.Provider value={{ currentBottomTab, setCurrentBottomTab, selectedDayIndex, setSelectedDayIndex }}>
      {children}
    </UiContext.Provider>
  );
};

// --- Hooks Customizados ---
const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within a TaskProvider');
  return context;
};

const useUi = () => {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used within a UiProvider');
  return context;
};

// --- Componentes ---

// CustomCheckbox (sem alterações)
interface CustomCheckboxProps { checked: boolean; accentColor: string; textColor: string; }
const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ checked, accentColor, textColor }) => {
  const bgColor = checked ? accentColor : '#FFFFFF';
  const borderColor = checked ? accentColor : BORDER_DONE_COLOR;
  return (
    <div
      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ease-in-out flex-shrink-0 cursor-pointer ml-[2px]`}
      style={{ backgroundColor: bgColor, borderColor: borderColor, boxShadow: checked ? `0 0 0 2px ${accentColor}66` : 'none' }}
      aria-checked={checked} role="checkbox"
    >
      {checked && (
        <motion.svg initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        > <polyline points="20 6 9 17 4 12"></polyline> </motion.svg>
      )}
    </div>
  );
};

// TaskModal (MODIFICADO para incluir opções de recorrência)
interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    title: string, time: string, date: string,
    color: { accentColorHex: string; darkTextColorHex: string },
    isRecurring: boolean, recurringDays: number[]
  ) => void;
  initialData?: Task | null;
  defaultDate?: string;
}
const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, initialData, defaultDate }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(initialData?.date || defaultDate || getTodayDateString());
  const [selectedColor, setSelectedColor] = useState<{ accentColorHex: string; darkTextColorHex: string }>(
    initialData ? { accentColorHex: initialData.accentColorHex, darkTextColorHex: initialData.darkTextColorHex } : pastelSuggestionPalette[Math.floor(Math.random() * pastelSuggestionPalette.length)]
  );
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurringDays, setRecurringDays] = useState<number[]>(initialData?.recurringDays || []);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSounds(true);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setTime(initialData.time);
        setDate(initialData.date || getTodayDateString());
        setSelectedColor({ accentColorHex: initialData.accentColorHex, darkTextColorHex: initialData.darkTextColorHex });
        setIsRecurring(initialData.isRecurring ?? false);
        setRecurringDays(initialData.recurringDays ?? []);
      } else {
        setTitle('');
        setTime('');
        setDate(defaultDate || getTodayDateString());
        setSelectedColor(pastelSuggestionPalette[Math.floor(Math.random() * pastelSuggestionPalette.length)]);
        setIsRecurring(false);
        setRecurringDays([]);
      }
      setTimeout(() => { document.getElementById('taskTitle')?.focus(); }, 100);
    }
  }, [initialData, isOpen, defaultDate]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSuggestionClick = (color: { accentColorHex: string; darkTextColorHex: string }) => { setSelectedColor(color); };

  const toggleRecurringDay = (dayIndex: number) => {
    setRecurringDays(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && date) {
      if (isRecurring && recurringDays.length === 0) {
        alert("Se a tarefa é recorrente, por favor, selecione pelo menos um dia da semana.");
        return;
      }
      onSubmit(title, time, date, selectedColor, isRecurring, recurringDays);
    } else {
      alert("O título e a data da tarefa são obrigatórios!");
    }
  };

  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.90, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: "easeOut" } },
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/40 backdrop-blur-sm"
      variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.div ref={modalContentRef} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl w-full max-w-lg mx-auto"
        variants={modalVariants} initial="hidden" animate="visible" exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex justify-between items-center mb-6 pb-4 border-b ${BORDER_COLOR_DEFAULT}`}>
          <h2 className="text-xl font-semibold" style={{ color: TEXT_PRIMARY }}>
            {initialData ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors rounded-full p-1 -mr-2" aria-label="Fechar Modal">
            <FiX size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Título */}
          <div>
            <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-600 mb-1">Título <span className="text-red-400">*</span></label>
            <input type="text" id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
              style={{ color: TEXT_PRIMARY }} placeholder="Ex: Comprar chá" onFocus={() => playSound('focus')} required
            />
          </div>

          {/* Data e Hora */}
          <div className='flex flex-col sm:flex-row sm:space-x-4 space-y-5 sm:space-y-0'>
            <div className="flex-1">
              <label htmlFor="taskDate" className="block text-sm font-medium text-gray-600 mb-1">
                Data {isRecurring ? <span className="text-xs text-gray-400">(Início)</span> : <span className="text-red-400">*</span>}
              </label>
              <input type="date" id="taskDate" value={date} onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
                style={{ color: TEXT_PRIMARY }} onFocus={() => playSound('focus')} required
              />
            </div>
            <div className="flex-1">
              <label htmlFor="taskTime" className="block text-sm font-medium text-gray-600 mb-1">Horário <span className='text-gray-400 text-xs'>(Opcional)</span></label>
              <input type="time" id="taskTime" value={time} onChange={(e) => setTime(e.target.value)}
                className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
                style={{ color: TEXT_PRIMARY }} onFocus={() => playSound('focus')}
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-4 pt-2"> {/* Added top padding */}
            {/* Custom Toggle Switch */}

            <div className="flex items-center justify-between">
              <label htmlFor="isRecurringToggle" className="text-sm font-medium text-gray-600 cursor-pointer select-none">
                Tarefa Recorrente
              </label>
              <button
                type="button"
                id="isRecurringToggle"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                // --- className focuses on layout, transitions, focus structure ---
                className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                    border-2 border-transparent
                    transition-colors duration-200 ease-in-out
                    hover:bg-gray-300
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-300
                `}
                // --- style handles the dynamic background color ---
                style={{
                  backgroundColor: isRecurring ? PRIMARY_APP_COLOR : '#E5E7EB', // Use hex for gray-200
                }}
              >
                <span className="sr-only">Ativar recorrência</span>
                <motion.span
                  layout // Animate layout changes
                  aria-hidden="true"
                  // --- className for thumb: layout, static styles, transitions ---
                  className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md
                      ring-0 transition-transform duration-200 ease-in-out
                      ${isRecurring ? 'translate-x-5' : 'translate-x-0'}
                  `}
                  transition={{ type: 'spring', stiffness: 700, damping: 35 }}
                />
              </button>
            </div>

            {/* Day Selector (Appears when recurring is true) */}
            <AnimatePresence>
              {isRecurring && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }} // Start hidden
                  animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} // Animate in
                  exit={{ height: 0, opacity: 0, marginTop: 0 }} // Animate out
                  transition={{ duration: 0.25, ease: "easeInOut" }} // Smooth transition
                  className="overflow-hidden" // Clip content during animation
                >
                  <label className="block text-sm font-medium text-gray-600 mb-3">
                    Repetir nos dias:
                  </label>
                  {/* Container for Weekdays (Mon-Fri) */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-2"> {/* Added mb-2 for spacing */}
                    {DAYS_OF_WEEK.slice(0, 5).map((day, index) => { // Slice for Mon-Fri (indices 0-4)
                      const actualIndex = index; // Index within the 0-6 range
                      const isSelected = recurringDays.includes(actualIndex);
                      return (
                        <motion.button
                          key={day}
                          type="button"
                          onClick={() => toggleRecurringDay(actualIndex)}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className={`
                              w-10 h-10 sm:w-11 sm:h-11 rounded-full border text-xs font-medium
                              flex items-center justify-center transition-all duration-200 ease-in-out
                              focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-purple-400
                              ${isSelected
                              ? 'text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50'
                            }
                          `}
                          style={isSelected ? { backgroundColor: PRIMARY_APP_COLOR, borderColor: PRIMARY_APP_COLOR } : {}}
                        >
                          {day.substring(0, 3)}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Container for Weekend (Sat-Sun) */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {DAYS_OF_WEEK.slice(5, 7).map((day, index) => { // Slice for Sat-Sun (indices 5-6)
                      const actualIndex = index + 5; // Adjust index to be 5 or 6
                      const isSelected = recurringDays.includes(actualIndex);
                      return (
                        <motion.button
                          key={day}
                          type="button"
                          onClick={() => toggleRecurringDay(actualIndex)}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className={`
                              w-10 h-10 sm:w-11 sm:h-11 rounded-full border text-xs font-medium
                              flex items-center justify-center transition-all duration-200 ease-in-out
                              focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-purple-400
                              ${isSelected
                              ? 'text-white shadow-sm'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50'
                            }
                          `}
                          style={isSelected ? { backgroundColor: PRIMARY_APP_COLOR, borderColor: PRIMARY_APP_COLOR } : {}}
                        >
                          {day.substring(0, 3)}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* Cor */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Cor</label>
            <div className="overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full">
              <div className="flex items-center space-x-2 py-1 w-max pr-2">
                {pastelSuggestionPalette.map((color) => (
                  <button key={color.accentColorHex} type="button"
                    className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none border-gray-100 ${selectedColor.accentColorHex === color.accentColorHex ? `${RING_FOCUS_SIZE} ring-offset-2 ${RING_FOCUS_COLOR_SECONDARY}` : ' hover:border-gray-400'}`}
                    style={{ backgroundColor: color.accentColorHex }} onClick={() => handleSuggestionClick(color)} aria-label={`Selecionar cor ${color.accentColorHex}`} onFocus={() => playSound('focus')}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Botões Ação */}
          <div className={`flex justify-end space-x-3 pt-4 border-t ${BORDER_COLOR_DEFAULT} mt-6`}>
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors duration-150 font-medium">Cancelar</button>
            <button type="submit" style={{ backgroundColor: selectedColor.accentColorHex, color: selectedColor.darkTextColorHex }}
              className={`px-5 py-2.5 rounded-lg transition-all duration-150 font-medium shadow-sm hover:shadow-md hover:brightness-105`}
            > {initialData ? 'Salvar Alterações' : 'Adicionar Tarefa'} </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// MainScreen (MODIFICADO para filtrar e exibir tarefas recorrentes)
const MainScreen: React.FC = () => {
  const { tasks, taskCompletions, toggleTaskDone, addTask, editTask, removeTask, reorderTasks } = useTasks();
  const { currentBottomTab, setCurrentBottomTab, selectedDayIndex, setSelectedDayIndex } = useUi();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showActionsTaskId, setShowActionsTaskId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useSounds(true);

  const selectedDateString = useMemo(() => getDateStringForDayOfWeek(selectedDayIndex), [selectedDayIndex]);

  // --- Lógica de Filtragem com useMemo (Adaptada para Recorrência) ---

  const filteredTasksBySearch = useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  // Filtra tarefas visíveis para o dia selecionado e determina o status de conclusão
  const tasksForSelectedDay = useMemo(() => {
    // Calcula a data correspondente ao índice do dia selecionado (na semana atual/próxima)
    const dateForFiltering = getDateStringForDayOfWeek(selectedDayIndex);

    const relevantTasks = filteredTasksBySearch.filter(task => {
      // Caso 1: Tarefa NÃO recorrente
      // Deve aparecer APENAS se sua data for EXATAMENTE a data da aba selecionada.
      if (!task.isRecurring) {
        return task.date === dateForFiltering;
      }
      // Caso 2: Tarefa recorrente
      // Deve aparecer SE:
      //   a) O dia da semana da aba selecionada está nos dias de recorrência da tarefa.
      //   b) A data de início da tarefa (task.date) é anterior ou igual à data específica da aba que estamos vendo.
      else { // task.isRecurring is true
        const occursOnThisDayOfWeek = task.recurringDays.includes(selectedDayIndex);
        const hasStartedByThisDate = task.date <= dateForFiltering;
        return occursOnThisDayOfWeek && hasStartedByThisDate;
      }
    });

    // Mapeia para incluir o status de conclusão para *este dia específico*
    return relevantTasks.map(task => {
      let isDoneForToday = false;
      const completionDate = dateForFiltering; // Usa a data calculada para a aba
      if (task.isRecurring) {
        isDoneForToday = (taskCompletions[task.id] || []).includes(completionDate);
      } else {
        isDoneForToday = task.done; // Usa o 'done' padrão para não recorrentes
      }
      return { ...task, isDoneForToday }; // Adiciona a propriedade temporária
    });

  }, [filteredTasksBySearch, selectedDayIndex, taskCompletions, tasks /* Adicionado tasks aqui para garantir re-cálculo se tasks mudar */]);

  // Separa em listas de incompletas e completas para o dia selecionado
  const incompleteTasksForSelectedDay = useMemo(() => {
    return tasksForSelectedDay.filter(task => !task.isDoneForToday);
  }, [tasksForSelectedDay]);

  const completedTasksForSelectedDay = useMemo(() => {
    return tasksForSelectedDay.filter(task => task.isDoneForToday);
  }, [tasksForSelectedDay]);

  // --- Handlers de Eventos ---
  const handleOpenModalForAdd = () => {
    playSound('modalOpen'); setEditingTask(null); setShowActionsTaskId(null); setIsModalOpen(true);
  };
  const handleOpenModalForEdit = (task: Task) => {
    playSound('modalOpen'); setEditingTask(task); setShowActionsTaskId(null); setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    playSound('modalClose'); setIsModalOpen(false); setEditingTask(null);
  };
  const handleModalSubmit = (
    title: string, time: string, date: string,
    color: { accentColorHex: string; darkTextColorHex: string },
    isRecurring: boolean, recurringDays: number[]
  ) => {
    if (editingTask) {
      editTask(editingTask.id, title, time, date, color, isRecurring, recurringDays);
    } else {
      addTask(title, time, date, color, isRecurring, recurringDays);
    }
    setTimeout(() => handleCloseModal(), 300); // Fecha após um pequeno delay
  };
  const handleDeleteTask = (id: number) => { removeTask(id); setShowActionsTaskId(null); };
  const handleReorderTask = (taskId: number, direction: 'up' | 'down') => { reorderTasks(taskId, direction); };

  // --- Lógica de Clique / Long Press (Modificada para passar data ao toggle) ---
  const handlePointerDown = (taskId: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (showActionsTaskId !== taskId) {
      longPressTimer.current = setTimeout(() => { setShowActionsTaskId(taskId); longPressTimer.current = null; }, 500);
    }
  };
  const handlePointerUpOrLeave = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleItemClick = (task: Task & { isDoneForToday: boolean }) => { // Recebe a task com o status do dia
    if (longPressTimer.current) { // Foi um clique rápido, não long press
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      // Passa a data selecionada para o toggle
      toggleTaskDone(task.id, selectedDateString);
      setShowActionsTaskId(null); // Fecha o menu se estava tentando abrir
    } else if (showActionsTaskId === task.id) { // Menu já estava aberto, clique fecha
      setShowActionsTaskId(null);
    } else { // Clique normal (ou clique após long press ter aberto o menu)
      // Passa a data selecionada para o toggle
      toggleTaskDone(task.id, selectedDateString);
    }
  };
  useEffect(() => { // Fecha menu de ações ao clicar fora (sem alterações)
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-task-item]') && !target.closest('[data-task-actions]')) {
        setShowActionsTaskId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleFocusSearch = () => { searchInputRef.current?.focus(); playSound('focus'); };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso
      if (isNaN(date.getTime())) throw new Error("Invalid date");
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
      console.error("Error formatting date:", dateString, error); return dateString;
    }
  };

  // --- Função para Renderizar Item de Tarefa (MODIFICADA para usar isDoneForToday) ---
  const renderTaskItem = (task: Task & { isDoneForToday: boolean }, index: number, list: (Task & { isDoneForToday: boolean })[]) => {
    const isFirst = index === 0;
    const isLast = index === list.length - 1;
    const isDone = task.isDoneForToday; // Usa o status calculado para o dia atual

    const getTaskBackgroundColor = () => {
      const lightAccentAlpha = '33'; const doneBgColor = '#F9FAFB'; const activeBgColor = '#F1F5F9';
      if (isDone) return doneBgColor;
      if (showActionsTaskId === task.id) return activeBgColor;
      try { if (/^#[0-9A-F]{6}$/i.test(task.accentColorHex)) return task.accentColorHex + lightAccentAlpha; } catch { /* ignore */ }
      return '#FFFFFF'; // Fallback
    };

    const titleColor = isDone ? TEXT_SECONDARY : (task.darkTextColorHex || TEXT_PRIMARY);
    const dateTimeColor = isDone ? TEXT_SECONDARY : (task.darkTextColorHex || TEXT_PRIMARY);
    const checkTextColor = getContrastingTextColor(task.accentColorHex);

    return (
      <motion.div
        key={task.id + '-' + selectedDateString} // Adiciona data para re-render correto ao mudar dia
        layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        data-task-item
        className={` relative flex items-center justify-between px-5 py-4 transition-colors duration-150 ease-in-out group
                     before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0 before:w-1
                     before:bg-[var(--task-accent-color)] before:transition-colors before:duration-150 `}
        style={{ '--task-accent-color': isDone ? BORDER_DONE_COLOR : task.accentColorHex, backgroundColor: getTaskBackgroundColor() } as React.CSSProperties}
        onPointerDown={() => handlePointerDown(task.id)} onPointerUp={handlePointerUpOrLeave} onPointerLeave={handlePointerUpOrLeave}
        onClick={() => handleItemClick(task)} onContextMenu={(e) => e.preventDefault()}
      >
        {/* Conteúdo da Tarefa */}
        <div className="flex items-center space-x-4 flex-grow overflow-hidden mr-4">
          {/* Passa o status de 'feito HOJE' para o checkbox */}
          <CustomCheckbox checked={isDone} accentColor={task.accentColorHex} textColor={checkTextColor} />
          <div className="flex-1 min-w-0">
            <p className={`text-base font-medium break-words ${isDone ? 'line-through' : ''}`}
              style={{ color: titleColor, textDecorationColor: isDone ? BORDER_DONE_COLOR : 'transparent' }}
            > {task.title} </p>
            {(task.time || task.isRecurring) && ( // Mostra info extra se tiver hora ou for recorrente
              <div className="flex items-center space-x-2 mt-1">
                {task.isRecurring && <FiRepeat className="w-3 h-3" style={{ color: dateTimeColor, opacity: isDone ? 0.5 : 0.7 }} />}
                {(task.time || task.date) && (
                  <p className={`text-xs ${isDone ? 'line-through' : ''}`}
                    style={{ color: dateTimeColor, opacity: isDone ? 0.7 : 0.9, textDecorationColor: isDone ? BORDER_DONE_COLOR : 'transparent' }}
                  >
                    {!task.isRecurring && task.date && formatDateDisplay(task.date)}
                    {!task.isRecurring && task.date && task.time && ' • '}
                    {task.time}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu de Ações (sem alterações lógicas, mas botões de reordenação podem ser baseados na lista filtrada) */}
        <AnimatePresence>
          {showActionsTaskId === task.id && (
            <motion.div data-task-actions initial={{ opacity: 0, scale: 0.8, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 10 }} transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1 bg-white p-1.5 rounded-lg border ${BORDER_COLOR_DEFAULT} shadow-md z-20`}
              onClick={(e) => e.stopPropagation()} // Impede que o clique no menu acione o clique no item
            >
              {/* TODO: Reordering logic might need adjustment if filtering changes order significantly - currently reorders based on GLOBAL list index */}
              <button onClick={() => handleReorderTask(task.id, 'up')} /* disabled={isFirst} */ aria-label="Mover para cima" title="Mover para cima"
                className={`p-2 rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100 /* ${isFirst ? 'text-gray-300 cursor-not-allowed' : '...'} */ `}>
                <FiArrowUp size={18} />
              </button>
              <button onClick={() => handleReorderTask(task.id, 'down')} /* disabled={isLast} */ aria-label="Mover para baixo" title="Mover para baixo"
                className={`p-2 rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100 /* ${isLast ? 'text-gray-300 cursor-not-allowed' : '...'} */`}>
                <FiArrowDown size={18} />
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
              <button onClick={() => handleOpenModalForEdit(task)} aria-label="Editar Tarefa" title="Editar Tarefa"
                className="p-2 text-blue-500 hover:text-blue-700 rounded-md hover:bg-blue-50 transition-colors">
                <FiEdit size={18} />
              </button>
              <button onClick={() => handleDeleteTask(task.id)} aria-label="Excluir Tarefa" title="Excluir Tarefa"
                className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors">
                <FiTrash size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // --- Renderização Principal ---
  return (
    <div className={`min-h-screen bg-gradient-to-br ${BACKGROUND_GRADIENT_FROM} ${BACKGROUND_VIA} ${BACKGROUND_GRADIENT_TO} font-sans relative pb-32 overflow-x-hidden`}>
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`absolute bg-purple-400/50 shadow-lg rounded-b-2xl w-full h-48 top-0 left-0 -z-10 ${currentBottomTab === 'home' ? 'hidden' : ''}`} />

        {/* Cabeçalho */}
        <header className="flex items-center justify-center pt-10 pb-8">
          <div className="flex items-center space-x-2">
            <img src={logoIcon} alt="Logo Ícone Diariê" className="w-16" />
            <img src={logoText} alt="Logo Texto Diariê" className="w-32" />
          </div>
        </header>

        {/* Busca */}
        <div className="mb-8 relative">
          <input ref={searchInputRef} type="text" placeholder="Buscar tarefa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full text-sm pl-12 pr-4 py-2 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} ${BORDER_FOCUS_COLOR_PRIMARY} bg-white transition duration-150 ease-in-out`}
            style={{ color: TEXT_PRIMARY, '::placeholder': { color: TEXT_SECONDARY } } as React.CSSProperties} onFocus={() => playSound('focus')}
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>

        {/* Abas de Dia da Semana */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
          <div className="flex space-x-2 pb-2 w-max mx-auto">
            {DAYS_OF_WEEK.map((day, index) => (
              <button
                key={day}
                onClick={() => {
                  setSelectedDayIndex(index);
                  playSound('navigation');
                }}
                className={`w-10 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ease-in-out text-center
          ${selectedDayIndex === index ? 'text-white shadow-md' : `bg-white hover:bg-gray-100 border ${BORDER_COLOR_DEFAULT}`}`}
                style={
                  selectedDayIndex === index
                    ? { backgroundColor: PRIMARY_APP_COLOR, color: 'white' }
                    : { color: TEXT_SECONDARY }
                }
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>


        <main>
          <section className={`bg-white mb-8 overflow-hidden rounded-2xl border ${BORDER_COLOR_DEFAULT} shadow-sm`}>
            <div className={`flex items-center justify-between border-b ${BORDER_COLOR_DEFAULT}`}>
              <h2 className={`text-lg font-semibold px-6 pt-5 pb-3 `} style={{ color: TEXT_PRIMARY }}>
                Tarefas de {DAYS_OF_WEEK[selectedDayIndex]}
              </h2>
              <p className="text-sm text-gray-500 px-6 pt-5 pb-3">
                {formatDateDisplay(selectedDateString)}
              </p>
            </div>
            <AnimatePresence initial={false}> {/* Anima adição/remoção */}
              <div className="divide-y divide-gray-100">
                {incompleteTasksForSelectedDay.length === 0 ? (
                  <p className="text-center text-sm py-10 px-6" style={{ color: TEXT_SECONDARY }}>
                    {searchTerm ? 'Nenhuma tarefa pendente encontrada.' : 'Nenhuma tarefa pendente para hoje.'}
                  </p>
                ) : (
                  incompleteTasksForSelectedDay.map((task, index) =>
                    renderTaskItem(task, index, incompleteTasksForSelectedDay)
                  )
                )}
              </div>
            </AnimatePresence>
          </section>

          {completedTasksForSelectedDay.length > 0 && (
            <section className={`bg-white/80 backdrop-blur-sm mb-8 overflow-hidden rounded-2xl border ${BORDER_COLOR_DEFAULT} border-dashed shadow-sm`}>
              <h2 className={`text-lg font-semibold px-6 pt-5 pb-3 border-b ${BORDER_COLOR_DEFAULT} border-dashed`} style={{ color: TEXT_PRIMARY }}>
                Tarefas Concluídas Hoje
              </h2>
              <AnimatePresence initial={false}>
                <div className="divide-y divide-gray-100">
                  {completedTasksForSelectedDay.map((task, index) =>
                    renderTaskItem(task, index, completedTasksForSelectedDay)
                  )}
                </div>
              </AnimatePresence>
            </section>
          )}

          {tasks.length === 0 && !searchTerm && (
            <p className="text-center py-10 px-6 mt-[-1rem] mb-8" style={{ color: TEXT_SECONDARY }}>
              Você ainda não tem tarefas. Que tal adicionar uma?
            </p>
          )}

        </main>

        {/* Botões Flutuantes */}
        <div className="fixed bottom-24 right-4 sm:right-6 lg:right-8 flex flex-col space-y-3 z-10">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={handleFocusSearch} aria-label="Focar na Busca" title="Focar na Busca"
            className={`w-14 h-14 bg-white border ${BORDER_COLOR_DEFAULT} rounded-2xl flex items-center justify-center shadow-lg hover:border-gray-300 transition-all focus:outline-none ${RING_FOCUS_SIZE} focus:ring-offset-2 focus:ring-gray-300`}
            style={{ color: PRIMARY_APP_COLOR }} > <FiSearch size={24} /> </motion.button>
          <motion.button whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.95 }} onClick={handleOpenModalForAdd} aria-label="Adicionar Tarefa" title="Adicionar Tarefa"
            style={{ backgroundColor: PRIMARY_APP_COLOR, color: 'white' }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg hover:bg-[${PRIMARY_APP_HOVER_COLOR}] transition-all focus:outline-none ${RING_FOCUS_SIZE} focus:ring-offset-2 focus:ring-[${PRIMARY_APP_COLOR}]`} >
            <FiPlus size={28} /> </motion.button>
        </div>

        {/* Navegação Inferior */}
        <nav className={`fixed bottom-0 left-0 right-0 bg-white/90 rounded-t-2xl backdrop-blur-sm border-t ${BORDER_COLOR_DEFAULT} z-10`}>
          <div className="max-w-md mx-auto flex justify-around items-center h-16">
            {[{ name: 'Home', icon: FiHome }, { name: 'Tasks', icon: FiCheckSquare }, { name: 'Search', icon: FiSearch }, { name: 'Calendar', icon: FiSquare }]
              .map((item) => (
                <button key={item.name} onClick={() => { setCurrentBottomTab(item.name); playSound('navigation') }} aria-label={item.name}
                  className="relative flex flex-col items-center justify-center h-full w-16 text-xs font-medium transition-colors duration-200 ease-in-out group focus:outline-none"
                  style={{ color: currentBottomTab === item.name ? PRIMARY_APP_COLOR : TEXT_SECONDARY }} >
                  <item.icon size={24} strokeWidth={currentBottomTab === item.name ? 2.5 : 2} />
                  {currentBottomTab === item.name && (<motion.div layoutId="activeNavIndicator" className="absolute bottom-1 w-6 h-1 rounded-full" style={{ backgroundColor: PRIMARY_APP_COLOR }} />)}
                </button>
              ))}
          </div>
        </nav>
      </div>

      {/* Renderização do Modal */}
      <AnimatePresence mode="wait" onExitComplete={() => setEditingTask(null)} >
        {isModalOpen && (
          <TaskModal key={editingTask ? `edit-${editingTask.id}` : "add-task-modal"}
            isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleModalSubmit}
            initialData={editingTask} defaultDate={selectedDateString} // Passa a data selecionada como padrão
          />
        )}
      </AnimatePresence>
    </div>
  );
};


// Componente Raiz da Aplicação
export default function App() {
  return (
    // Envolve a aplicação com os providers de UI e Tarefas
    <UiProvider>
      <TaskProvider>
        <MainScreen />
      </TaskProvider>
    </UiProvider>
  );
}
