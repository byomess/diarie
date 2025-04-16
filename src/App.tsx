import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useMemo } from 'react';
import { FiHome, FiCheckSquare, FiSearch, FiSquare, FiPlus, FiTrash, FiEdit, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// Importe SEUS hooks - NÃO USE AS IMPLEMENTAÇÕES COMENTADAS NO FINAL
import useLocalStorage from './hooks/useLocalStorage'; // Certifique-se que o caminho está correto
import { useSounds } from './hooks/useSounds';      // Certifique-se que o caminho está correto

// Importe seus assets - Certifique-se que os caminhos estão corretos
import logoIcon from './assets/diarie_logo_icon.png';
import logoText from './assets/diarie_logo_text.png';

// --- Constantes ---
const PRIMARY_APP_COLOR = '#bd92e8';
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
const LOCAL_STORAGE_TASKS_KEY = 'tasks_v1';
const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// --- Interfaces ---
interface Task {
  id: number;
  title: string;
  time: string;
  date: string; // YYYY-MM-DD
  accentColorHex: string;
  darkTextColorHex: string;
  done: boolean;
}

interface TaskContextType {
  tasks: Task[];
  toggleTaskDone: (id: number) => void;
  addTask: (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => void;
  editTask: (id: number, title: string, time: string, date: string, color?: { accentColorHex: string; darkTextColorHex: string }) => void;
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
    { accentColorHex: '#FFDAB9', darkTextColorHex: '#A0522D' }, // PeachPuff / Sienna
    { accentColorHex: '#E6E6FA', darkTextColorHex: '#483D8B' }, // Lavender / DarkSlateBlue
    { accentColorHex: '#AFEEEE', darkTextColorHex: '#008B8B' }, // PaleTurquoise / DarkCyan
    { accentColorHex: '#F0FFF0', darkTextColorHex: '#2E8B57' }, // Honeydew / SeaGreen
    { accentColorHex: '#FFFACD', darkTextColorHex: '#B8860B' }, // LemonChiffon / DarkGoldenrod
    { accentColorHex: '#FFC0CB', darkTextColorHex: '#C71585' }, // Pink / MediumVioletRed
    { accentColorHex: '#D8BFD8', darkTextColorHex: '#8A2BE2' }, // Thistle / BlueViolet
    { accentColorHex: '#ADD8E6', darkTextColorHex: '#4682B4' }, // LightBlue / SteelBlue
    { accentColorHex: '#98FB98', darkTextColorHex: '#3CB371' }, // PaleGreen / MediumSeaGreen
    { accentColorHex: '#F5F5DC', darkTextColorHex: '#8B4513' }, // Beige / SaddleBrown
    { accentColorHex: '#FFE4E1', darkTextColorHex: '#CD5C5C' }, // MistyRose / IndianRed
    { accentColorHex: '#FAFAD2', darkTextColorHex: '#BDB76B' }, // LightGoldenrodYellow / DarkKhaki
    { accentColorHex: '#B0E0E6', darkTextColorHex: '#5F9EA0' }, // PowderBlue / CadetBlue
    { accentColorHex: '#FFEFD5', darkTextColorHex: '#D2691E' }, // PapayaWhip / Chocolate
];

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
  // Use o hook useLocalStorage importado
  const [tasks, setTasks] = useLocalStorage<Task[]>(LOCAL_STORAGE_TASKS_KEY, [
    // Dados de exemplo iniciais
    { id: 1, title: 'Trocar areia dos gatos', time: '08:00', date: today, ...pastelSuggestionPalette[0], done: false },
    { id: 2, title: 'Colocar água e ração', time: '09:30', date: today, ...pastelSuggestionPalette[7], done: false },
    { id: 3, title: "Limpar nariz da Belinha", time: '11:00', date: today, ...pastelSuggestionPalette[6], done: false },
    { id: 4, title: 'Varrer os cômodos', time: '13:00', date: today, ...pastelSuggestionPalette[8], done: false },
    { id: 5, title: "Passar pano", time: '14:00', date: today, ...pastelSuggestionPalette[4], done: true }, // Tarefa feita hoje
  ]);

  const addTask = (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => {
    playSound('createTask');
    const newTask: Task = {
      id: Date.now(), title, time, date,
      accentColorHex: color.accentColorHex, darkTextColorHex: color.darkTextColorHex,
      done: false,
    };
    setTasks((prev) => [newTask, ...prev]); // Adiciona no início
  };

  const toggleTaskDone = (id: number) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          playSound(task.done ? 'taskUndone' : 'taskDone');
          return { ...task, done: !task.done }; // Apenas inverte o status 'done'
        }
        return task;
      })
    );
    // A re-renderização do MainScreen usará os novos filtros baseados neste estado atualizado
  };

  const editTask = (id: number, title: string, time: string, date: string, color?: { accentColorHex: string; darkTextColorHex: string }) => {
    playSound('createTask'); // ou 'editTask'
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? {
          ...task, title, time, date,
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
    <TaskContext.Provider value={{ tasks, toggleTaskDone, addTask, editTask, removeTask, reorderTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

const UiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentBottomTab, setCurrentBottomTab] = useState<string>('Tasks');
  const today = new Date();
  const initialDayIndex = (today.getDay() + 6) % 7;
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

// TaskModal (sem alterações funcionais significativas)
interface TaskModalProps {
    isOpen: boolean; onClose: () => void;
    onSubmit: (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => void;
    initialData?: Task | null; defaultDate?: string;
}
const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSubmit, initialData, defaultDate }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(initialData ? initialData.date : (defaultDate || getTodayDateString()));
  const [selectedColor, setSelectedColor] = useState<{ accentColorHex: string; darkTextColorHex: string }>(
    initialData ? { accentColorHex: initialData.accentColorHex, darkTextColorHex: initialData.darkTextColorHex } : pastelSuggestionPalette[Math.floor(Math.random() * pastelSuggestionPalette.length)]
  );
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSounds(true);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title); setTime(initialData.time); setDate(initialData.date || getTodayDateString());
        setSelectedColor({ accentColorHex: initialData.accentColorHex, darkTextColorHex: initialData.darkTextColorHex });
      } else {
        setTitle(''); setTime(''); setDate(defaultDate || getTodayDateString());
        setSelectedColor(pastelSuggestionPalette[Math.floor(Math.random() * pastelSuggestionPalette.length)]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && date) {
      onSubmit(title, time, date, selectedColor);
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
          <div>
            <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-600 mb-1">Título <span className="text-red-400">*</span></label>
            <input type="text" id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2.5 border ${BORDER_COLOR_DEFAULT} rounded-lg focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} focus:border-[${selectedColor.accentColorHex}] transition duration-150 ease-in-out`}
              style={{ color: TEXT_PRIMARY }} placeholder="Ex: Comprar chá" onFocus={() => playSound('focus')} required
            />
          </div>
          <div className='flex flex-col sm:flex-row sm:space-x-4 space-y-5 sm:space-y-0'>
            <div className="flex-1">
              <label htmlFor="taskDate" className="block text-sm font-medium text-gray-600 mb-1">Data <span className="text-red-400">*</span></label>
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

// MainScreen (Lógica de filtragem e renderização revisada/confirmada)
const MainScreen: React.FC = () => {
  const { tasks, toggleTaskDone, addTask, editTask, removeTask, reorderTasks } = useTasks();
  const { currentBottomTab, setCurrentBottomTab, selectedDayIndex, setSelectedDayIndex } = useUi();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showActionsTaskId, setShowActionsTaskId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useSounds(true);

  const todayDateString = getTodayDateString();
  // Recalcula a string da data selecionada quando o índice do dia muda
  const selectedDateString = useMemo(() => getDateStringForDayOfWeek(selectedDayIndex), [selectedDayIndex]);

  // --- Lógica de Filtragem com useMemo ---

  // 1. Filtra TODAS as tarefas pelo termo de busca primeiro
  const filteredTasksBySearch = useMemo(() => {
      if (!searchTerm) return tasks; // Otimização: se não há busca, retorna todas
      return tasks.filter(task =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [tasks, searchTerm]);

  // 2. Filtra tarefas NÃO FEITAS para o DIA SELECIONADO (a partir das tarefas filtradas pela busca)
  const incompleteTasksForSelectedDay = useMemo(() => {
      // console.log(`Filtrando incompletas para ${selectedDateString}`);
      return filteredTasksBySearch.filter(task =>
          task.date === selectedDateString && !task.done
      );
  }, [filteredTasksBySearch, selectedDateString]); // Depende da busca E do dia selecionado

  // 3. Filtra tarefas FEITAS na DATA DE HOJE (a partir das tarefas filtradas pela busca)
  const completedTasksToday = useMemo(() => {
      // console.log(`Filtrando completas para HOJE (${todayDateString})`);
      return filteredTasksBySearch.filter(task =>
          task.date === todayDateString && task.done
      );
  }, [filteredTasksBySearch, todayDateString]); // Depende da busca E da data de HOJE


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
  const handleModalSubmit = (title: string, time: string, date: string, color: { accentColorHex: string; darkTextColorHex: string }) => {
    if (editingTask) {
      editTask(editingTask.id, title, time, date, color);
    } else {
      addTask(title, time, date, color);
    }
    setTimeout(() => handleCloseModal(), 300); // Fecha após um pequeno delay
  };
  const handleDeleteTask = (id: number) => { removeTask(id); setShowActionsTaskId(null); };
  const handleReorderTask = (taskId: number, direction: 'up' | 'down') => { reorderTasks(taskId, direction); };

  // --- Lógica de Clique / Long Press ---
  const handlePointerDown = (taskId: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (showActionsTaskId !== taskId) {
      longPressTimer.current = setTimeout(() => { setShowActionsTaskId(taskId); longPressTimer.current = null; }, 500);
    }
  };
  const handlePointerUpOrLeave = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const handleItemClick = (task: Task) => {
    if (longPressTimer.current) { // Foi um clique rápido, não long press
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      toggleTaskDone(task.id); // Apenas marca/desmarca
      setShowActionsTaskId(null); // Fecha o menu se estava tentando abrir
    } else if (showActionsTaskId === task.id) { // Menu já estava aberto, clique fecha
      setShowActionsTaskId(null);
    } else { // Clique normal (ou clique após long press ter aberto o menu)
      toggleTaskDone(task.id);
      // Opcional: manter ou fechar o menu de ações ao marcar/desmarcar?
      // setShowActionsTaskId(null); // Descomente para fechar o menu ao marcar/desmarcar
    }
  };
  useEffect(() => { // Fecha menu de ações ao clicar fora
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

  // --- Função para Renderizar Item de Tarefa ---
  // Recebe a lista específica (incompleta ou completa) para calcular isFirst/isLast corretamente
  const renderTaskItem = (task: Task, index: number, list: Task[]) => {
    const isFirst = index === 0;
    const isLast = index === list.length - 1;

    const getTaskBackgroundColor = () => {
        const lightAccentAlpha = '33'; const doneBgColor = '#F9FAFB'; const activeBgColor = '#F1F5F9';
        if (task.done) return doneBgColor;
        if (showActionsTaskId === task.id) return activeBgColor;
        try { if (/^#[0-9A-F]{6}$/i.test(task.accentColorHex)) return task.accentColorHex + lightAccentAlpha; } catch { /* ignore */ }
        return '#FFFFFF'; // Fallback
    };

    const titleColor = task.done ? TEXT_SECONDARY : (task.darkTextColorHex || TEXT_PRIMARY);
    const dateTimeColor = task.done ? TEXT_SECONDARY : (task.darkTextColorHex || TEXT_PRIMARY);
    const checkTextColor = getContrastingTextColor(task.accentColorHex);

    return (
      <motion.div
        key={task.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        data-task-item // Para detecção de clique fora
        className={` relative flex items-center justify-between px-5 py-4 transition-colors duration-150 ease-in-out group
                     before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0 before:w-1
                     before:bg-[var(--task-accent-color)] before:transition-colors before:duration-150 `}
        style={{ '--task-accent-color': task.done ? BORDER_DONE_COLOR : task.accentColorHex, backgroundColor: getTaskBackgroundColor() } as React.CSSProperties}
        onPointerDown={() => handlePointerDown(task.id)} onPointerUp={handlePointerUpOrLeave} onPointerLeave={handlePointerUpOrLeave}
        onClick={() => handleItemClick(task)} onContextMenu={(e) => e.preventDefault()}
      >
        {/* Conteúdo da Tarefa */}
        <div className="flex items-center space-x-4 flex-grow overflow-hidden mr-4">
            <CustomCheckbox checked={task.done} accentColor={task.accentColorHex} textColor={checkTextColor} />
            <div className="flex-1 min-w-0">
                <p className={`text-base font-medium break-words ${task.done ? 'line-through' : ''}`}
                   style={{ color: titleColor, textDecorationColor: task.done ? BORDER_DONE_COLOR : 'transparent' }}
                > {task.title} </p>
                {(task.date || task.time) && (
                    <div className="flex items-center space-x-2 mt-1">
                        <p className={`text-xs ${task.done ? 'line-through' : ''}`}
                           style={{ color: dateTimeColor, opacity: task.done ? 0.7 : 0.9, textDecorationColor: task.done ? BORDER_DONE_COLOR : 'transparent' }}
                        >
                            {task.date && formatDateDisplay(task.date)}
                            {task.date && task.time && ' • '}
                            {task.time}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Menu de Ações */}
        <AnimatePresence>
            {showActionsTaskId === task.id && (
                <motion.div data-task-actions initial={{ opacity: 0, scale: 0.8, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 10 }} transition={{ duration: 0.15, ease: 'easeOut' }}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1 bg-white p-1.5 rounded-lg border ${BORDER_COLOR_DEFAULT} shadow-md z-20`}
                    onClick={(e) => e.stopPropagation()} // Impede que o clique no menu acione o clique no item
                >
                    <button onClick={() => handleReorderTask(task.id, 'up')} disabled={isFirst} aria-label="Mover para cima" title="Mover para cima"
                            className={`p-2 rounded-md transition-colors ${isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                        <FiArrowUp size={18} />
                    </button>
                    <button onClick={() => handleReorderTask(task.id, 'down')} disabled={isLast} aria-label="Mover para baixo" title="Mover para baixo"
                            className={`p-2 rounded-md transition-colors ${isLast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <header className="flex items-center justify-center pt-10 pb-8">
          <div className="flex items-center space-x-2">
            <img src={logoIcon} alt="Logo Ícone Diariê" className="w-16" />
            <img src={logoText} alt="Logo Texto Diariê" className="w-32" />
          </div>
        </header>

        {/* Busca */}
        <div className="mb-4 relative">
          <input ref={searchInputRef} type="text" placeholder="Buscar tarefa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 border ${BORDER_COLOR_DEFAULT} rounded-xl focus:outline-none ${RING_FOCUS_SIZE} ${RING_FOCUS_COLOR_PRIMARY} ${BORDER_FOCUS_COLOR_PRIMARY} bg-white transition duration-150 ease-in-out shadow-sm`}
            style={{ color: TEXT_PRIMARY, '::placeholder': { color: TEXT_SECONDARY } } as React.CSSProperties} onFocus={() => playSound('focus')}
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={22} />
        </div>

        {/* Abas de Dia da Semana */}
        <div className="mb-6 overflow-x-auto scrollbar-hide">
           <div className="flex space-x-2 pb-2 w-max mx-auto">
                {DAYS_OF_WEEK.map((day, index) => (
                    <button key={day} onClick={() => { setSelectedDayIndex(index); playSound('navigation'); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ease-in-out whitespace-nowrap
                            ${selectedDayIndex === index ? `text-white shadow-md` : `bg-white hover:bg-gray-100 border ${BORDER_COLOR_DEFAULT}`}`}
                            style={selectedDayIndex === index ? { backgroundColor: PRIMARY_APP_COLOR, color: 'white' } : { color: TEXT_SECONDARY }}
                    > {day} </button>
                ))}
            </div>
        </div>

        <main>
          {/* Container 1: Tarefas Incompletas do Dia Selecionado */}
          <section className={`bg-white mb-8 overflow-hidden rounded-2xl border ${BORDER_COLOR_DEFAULT} shadow-sm`}>
            <h2 className={`text-lg font-semibold px-6 pt-5 pb-3 border-b ${BORDER_COLOR_DEFAULT}`} style={{ color: TEXT_PRIMARY }}>
              Tarefas de {DAYS_OF_WEEK[selectedDayIndex]} {/* Título Dinâmico */}
            </h2>
            <AnimatePresence initial={false}> {/* Anima adição/remoção */}
              <div className="divide-y divide-gray-100">
                {incompleteTasksForSelectedDay.length === 0 ? (
                  <p className="text-center py-10 px-6" style={{ color: TEXT_SECONDARY }}>
                    {searchTerm ? 'Nenhuma tarefa pendente encontrada.' : 'Nenhuma tarefa pendente para este dia.'}
                  </p>
                ) : (
                  // Renderiza cada tarefa incompleta passando a lista para renderTaskItem
                  incompleteTasksForSelectedDay.map((task, index) =>
                    renderTaskItem(task, index, incompleteTasksForSelectedDay)
                  )
                )}
              </div>
            </AnimatePresence>
          </section>

          {/* Container 2: Tarefas Feitas Hoje */}
          {/* Renderiza esta seção SOMENTE se houver tarefas completas HOJE (após filtro de busca) */}
          {completedTasksToday.length > 0 && (
                <section className={`bg-white/80 backdrop-blur-sm mb-8 overflow-hidden rounded-2xl border ${BORDER_COLOR_DEFAULT} border-dashed shadow-sm`}>
                    <h2 className={`text-lg font-semibold px-6 pt-5 pb-3 border-b ${BORDER_COLOR_DEFAULT} border-dashed`} style={{ color: TEXT_PRIMARY }}>
                        Tarefas Feitas Hoje
                    </h2>
                    <AnimatePresence initial={false}>
                        <div className="divide-y divide-gray-100">
                            {/* Renderiza cada tarefa completa hoje passando a lista para renderTaskItem */}
                            {completedTasksToday.map((task, index) =>
                                renderTaskItem(task, index, completedTasksToday)
                            )}
                        </div>
                    </AnimatePresence>
                </section>
           )}

           {/* Mensagem caso NENHUMA tarefa exista (nem incompleta nem feita hoje) */}
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
        <nav className={`fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t ${BORDER_COLOR_DEFAULT} z-10`}>
          <div className="max-w-md mx-auto flex justify-around items-center h-16">
            {[ { name: 'Home', icon: FiHome }, { name: 'Tasks', icon: FiCheckSquare }, { name: 'Search', icon: FiSearch }, { name: 'Calendar', icon: FiSquare } ]
             .map((item) => (
              <button key={item.name} onClick={() => {setCurrentBottomTab(item.name); playSound('navigation')}} aria-label={item.name}
                      className="relative flex flex-col items-center justify-center h-full w-16 text-xs font-medium transition-colors duration-200 ease-in-out group focus:outline-none"
                      style={{ color: currentBottomTab === item.name ? PRIMARY_APP_COLOR : TEXT_SECONDARY }} >
                <item.icon size={24} strokeWidth={currentBottomTab === item.name ? 2.5 : 2} />
                {currentBottomTab === item.name && ( <motion.div layoutId="activeNavIndicator" className="absolute bottom-1 w-6 h-1 rounded-full" style={{ backgroundColor: PRIMARY_APP_COLOR }} /> )}
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
