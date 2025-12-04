import { Task, TaskStatus } from '../types';

export const calculateStreak = (tasks: Task[]) => {
    const completedDates = new Set<string>();
    tasks.forEach(t => {
        if (t.status === TaskStatus.Done) {
            // Use local date string for grouping days
            const dateStr = new Date(t.startTime).toLocaleDateString('en-CA'); // YYYY-MM-DD format
            completedDates.add(dateStr);
        }
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    const checkDate = new Date();
    let currentStreak = 0;
    
    // If done today, start counting from today
    const isDoneToday = completedDates.has(todayStr);
    
    if (isDoneToday) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
    } else {
        // If not done today, check yesterday. If done yesterday, streak is alive.
        // If not done yesterday, streak is 0.
        checkDate.setDate(checkDate.getDate() - 1);
        if (!completedDates.has(checkDate.toLocaleDateString('en-CA'))) {
            return { count: 0, completedToday: false };
        }
    }

    // Count backwards
    while (true) {
        const dateStr = checkDate.toLocaleDateString('en-CA');
        if (completedDates.has(dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return { count: currentStreak, completedToday: isDoneToday };
};
