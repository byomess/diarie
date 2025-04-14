import { useState, useEffect } from 'react';

// Função auxiliar para obter valor (isolada para clareza)
function getStorageValue<T>(key: string, defaultValue: T | (() => T)): T {
    // Prevent build errors during server-side rendering
    if (typeof window === 'undefined') {
        return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
    }
    try {
        const saved = window.localStorage.getItem(key);
        const initial = saved ? (JSON.parse(saved) as T) : null;
        return initial ?? (typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue);
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
    }
}

function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        return getStorageValue(key, initialValue);
    });

    // Hook para atualizar o localStorage quando o estado muda
    useEffect(() => {
        // Prevent build errors during server-side rendering
        if (typeof window !== 'undefined') {
             try {
                window.localStorage.setItem(key, JSON.stringify(storedValue));
             } catch (error) {
                 console.warn(`Error setting localStorage key “${key}”:`, error);
             }
        }
    }, [key, storedValue]);

    // Hook opcional para ouvir mudanças no localStorage de outras abas/janelas
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key && event.newValue !== null) {
                 try {
                     setStoredValue(JSON.parse(event.newValue) as T);
                 } catch (error) {
                     console.warn(`Error parsing storage event for key “${key}”:`, error);
                 }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    // A função setter que atualiza o estado e implicitamente o localStorage (via useEffect)
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
        } catch (error) {
             console.warn(`Error setting value for key “${key}”:`, error);
        }
    };

    return [storedValue, setValue];
}

export default useLocalStorage;
