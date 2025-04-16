// src/hooks/useSounds.ts
import { useCallback } from 'react';
import { Howl } from 'howler';

// Define sound map outside the hook
const soundMap = {
    createTask: new Howl({ src: ['/sounds/create_task.ogg', '/sounds/create_task.wav'], volume: 0.7 }),
    deleteTask: new Howl({ src: ['/sounds/delete_task.ogg', '/sounds/delete_task.wav'], volume: 0.7 }),
    reorderTask: new Howl({ src: ['/sounds/reorder_task.ogg', '/sounds/reorder_task.wav'], volume: 0.7 }),
    taskDone: new Howl({ src: ['/sounds/task_done.ogg', '/sounds/task_done.wav'], volume: 0.7 }),
    taskUndone: new Howl({ src: ['/sounds/task_undone.ogg', '/sounds/task_undone.wav'], volume: 0.7 }),
    modalOpen: new Howl({ src: ['/sounds/modal_open.ogg', '/sounds/modal_open.wav'], volume: 0.7 }),
    modalClose: new Howl({ src: ['/sounds/modal_close.ogg', '/sounds/modal_close.wav'], volume: 0.7 }),
    focus: new Howl({ src: ['/sounds/focus.ogg', '/sounds/focus.wav'], volume: 0.7 }),
    navigation: new Howl({ src: ['/sounds/navigation.ogg', '/sounds/navigation.mp3'], volume: 0.7 }),

    // buttonPress: new Howl({ src: ['/sounds/small_beep.ogg', '/sounds/small_beep.wav'], volume: 0.7 }),
    // typing: new Howl({ src: ['/sounds/typing.wav', '/sounds/typing.mp3'], volume: 0.4 }),
    // alarm: new Howl({
    //     src: ['/sounds/alarm_1.ogg', '/sounds/alarm_1.wav'],
    //     volume: 0.8,
    //     loop: false
    // }),
    // select: new Howl({ src: ['/sounds/select.ogg', '/sounds/select.mp3'], volume: 0.5 }),
    // confirm: new Howl({ src: ['/sounds/confirm.ogg', '/sounds/confirm.wav'], volume: 0.5 }),
    // remove: new Howl({ src: ['/sounds/remove.ogg', '/sounds/remove.mp3'], volume: 0.5 }),
    // focusStart: new Howl({ src: ['/sounds/focus_start.ogg', '/sounds/focus_start.wav'], volume: 0.5 }),
    // focusAlmostEnding: new Howl({ src: ['/sounds/focus_almost_ending.ogg', '/sounds/focus_almost_ending.mp3', '/sounds/focus_almost_ending.wav'], volume: 0.2 }),
    // hyperfocus: new Howl({ src: ['/sounds/hyperfocus.ogg', '/sounds/hyperfocus.mp3'], volume: 0.5 }),
};

export type SoundName = keyof typeof soundMap;

export function useSounds(soundEnabled: boolean) {
    const playSound = useCallback((soundName: SoundName) => {
        if (soundEnabled && soundMap[soundName]) {
            soundMap[soundName].play();
        }
    }, [soundEnabled]);

    return { playSound };
}