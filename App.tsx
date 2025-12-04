
import React, { useState, useCallback, useEffect, FC, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import MonthlyView from './components/MonthlyView';
import JournalView from './components/JournalView';
import FinanceView from './components/FinanceView';
import CanvasView from './components/CanvasView';
import AddTaskModal from './components/AddTaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import FocusMode from './components/FocusMode';
import PlusIcon from './components/icons/PlusIcon';
import { useTasks } from './hooks/useTasks';
import { useJournals } from './hooks/useJournals';
import { useFinance } from './hooks/useFinance';
import { useGoals } from './hooks/useGoals'; // Import useGoals
import { View, Task, TaskStatus, Recurrence, FateCard } from './types';
import { useNotifications } from './hooks/useNotifications';
import { FocusTimerProvider, useFocusTimer } from './contexts/FocusTimerContext';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import OverdueView from './components/OverdueView';
import OnboardingTour from './components/OnboardingTour';
import MenuIcon from './components/icons/MenuIcon';
import FlowmindIcon from './components/icons/FlowmindIcon';
import AiAssistant from './components/AiAssistant';
import SparklesBotIcon from './components/icons/SparklesBotIcon';
import ConfirmationModal from './components/ConfirmationModal';
import { usePwaInstall } from './hooks/usePwaInstall';
import InstallPwaPrompt from './components/InstallPwaPrompt';
import PermissionWizard from './components/PermissionWizard';
import SettingsView from './components/SettingsView';
import DeleteAccountModal from './components/DeleteAccountModal';
import DeleteSuccessModal from './components/DeleteSuccessModal';
import LandingPage from './components/LandingPage';
import { useTheme } from './contexts/ThemeContext';
import Mascot from './components/Mascot';
import GamificationShopModal from './components/GamificationShopModal';
import MusicPlayer from './components/MusicPlayer';
import DailyFateModal from './components/DailyFateModal';
import GoalsView from './components/GoalsView';
import SocialMediaView from './components/SocialMediaView';
import { calculateStreak } from './utils/streakUtils';

const AppContent: FC = () => {
  const [currentView, setCurrentView] = useState<View>(() => {
    const savedView = localStorage.getItem('flowmind-currentView') as View;
    const validViews: View[] = ['daily', 'overdue', 'weekly', 'monthly', 'journal', 'finance', 'canvas', 'settings', 'goals', 'social'];
    return savedView && validViews.includes(savedView) ? savedView : 'daily';
  });

  const { tasks, addTask, updateTask, deleteTask, bulkDeleteTasks, bulkUpdateTasks, loading: tasksLoading, error: tasksError } = useTasks();
  const { journals, loading: journalsLoading, error: journalsError, createOrUpdateJournal, downloadJournal, deleteJournal } = useJournals();
  const { expenses, addExpense, updateExpense, deleteExpense, loading: financeLoading, error: financeError, isTableMissing } = useFinance();
  // Fetch goals to get linked tags
  const { goals } = useGoals(); 
  
  const { requestNotificationPermission } = useNotifications(tasks);
  const { session, signOut, profile, updateUserProfile, setDailyFateCard } = useAuth();
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourFakeTask, setTourFakeTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [initialTaskData, setInitialTaskData] = useState<Omit<Task, 'id' | 'createdAt' | 'userId'> | null>(null);
  const { installPrompt, triggerInstall } = usePwaInstall();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [showPermissionWizard, setShowPermissionWizard] = useState(false);
  const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [mascotAction, setMascotAction] = useState<'idle' | 'eating' | 'celebrating'>('idle');
  const [isShopOpen, setIsShopOpen] = useState(false); 
  const [showFateModal, setShowFateModal] = useState(false);
  
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicPlayerExpanded, setIsMusicPlayerExpanded] = useState(false);

  const { startFocusSession, task: focusTask, visibility } = useFocusTimer();

  const streakStats = useMemo(() => calculateStreak(tasks), [tasks]);

  // --- Calculate Available Tags for AddTaskModal ---
  const availableTags = useMemo(() => {
      const tags = new Map<string, { name: string; isGoal: boolean }>();

      // 1. Add tags from Life Goals (High priority)
      goals.forEach(g => {
          if (g.type === 'task' && g.linkedTag) {
              const tagClean = g.linkedTag.toLowerCase().trim();
              tags.set(tagClean, { name: tagClean, isGoal: true });
          }
      });

      // 2. Add tags from Task History
      tasks.forEach(t => {
          if (t.tags) {
              t.tags.forEach(tag => {
                  const tagClean = tag.toLowerCase().trim();
                  if (!tags.has(tagClean)) {
                      tags.set(tagClean, { name: tagClean, isGoal: false });
                  }
              });
          }
      });

      return Array.from(tags.values());
  }, [goals, tasks]);


  useEffect(() => {
    if (session) {
        localStorage.setItem('flowmind-currentView', currentView);
    }
  }, [currentView, session]);

  useEffect(() => {
    if (installPrompt) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [installPrompt]);

  // Check for Daily Fate Card Reset
  useEffect(() => {
      if (profile && !showTour) {
          const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
          
          // If lastFateDate is missing or not today, show modal
          if (profile.lastFateDate !== today) {
              // Slight delay to allow loading to settle
              setTimeout(() => setShowFateModal(true), 1000);
          }
      }
  }, [profile, showTour]);

  useEffect(() => {
    if (profile && profile.hasCompletedOnboarding === false && !showTour) {
        const timer = setTimeout(() => {
            setShowTour(true);
            const fakeTask: Task = {
                id: 'tour-task',
                userId: 'tour-user',
                title: 'Contoh Tugas: Baca Buku',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 3600000).toISOString(),
                status: TaskStatus.ToDo,
                checklist: [],
                notes: 'Tugas ini hanya contoh untuk tur.',
                isImportant: true,
                recurrence: Recurrence.None,
                createdAt: new Date().toISOString()
            };
            setTourFakeTask(fakeTask);
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [profile, showTour]);
  
  useEffect(() => {
      const hasSeenWizard = localStorage.getItem('flowmind-permissions-wizard-seen');
      if (session && !hasSeenWizard && !showTour) {
          if (Notification.permission === 'default') {
               const timer = setTimeout(() => setShowPermissionWizard(true), 2000);
               return () => clearTimeout(timer);
          }
      }
  }, [session, showTour]);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleTourClose = () => {
    setShowTour(false);
    setTourFakeTask(null);
    updateUserProfile({ hasCompletedOnboarding: true });
  };
  
  const handlePermissionWizardClose = (skipped: boolean) => {
      setShowPermissionWizard(false);
      localStorage.setItem('flowmind-permissions-wizard-seen', 'true');
  };

  const handleLogoutRequest = () => {
      setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
      setShowLogoutConfirm(false);
      await signOut();
      setCurrentView('daily');
  };
  
  const handleDeleteAccountRequest = () => {
      setDeleteAccountModalOpen(true);
  }
  
  const handleDeleteAccountConfirm = async (password: string) => {
      const response = await fetch('/api/delete-user', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ password })
      });

      if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Gagal menghapus akun.');
      }
      
      setDeleteAccountModalOpen(false);
      setShowDeleteSuccess(true);
      await signOut();
  };

  const handleOpenManualAdd = (taskData: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
      setInitialTaskData(taskData);
      setAddModalOpen(true);
  };
  
  const triggerMascotAction = (action: 'idle' | 'eating' | 'celebrating') => {
      setMascotAction(action);
      setTimeout(() => setMascotAction('idle'), 1000);
  };
  
  const handleSelectFateCard = async (card: FateCard) => {
      await setDailyFateCard(card);
      setShowFateModal(false);
      // Trigger mascot celebration
      triggerMascotAction('celebrating');
  };

  const displayTasks = showTour && tourFakeTask ? [tourFakeTask, ...tasks] : tasks;

  const renderView = () => {
    if (tasksLoading || journalsLoading || financeLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-slate-500 dark:text-slate-400">Memuat data...</p>
            </div>
        );
    }

    if (tasksError) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="text-red-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-semibold">{tasksError}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Muat Ulang
                </button>
            </div>
        );
    }

    switch (currentView) {
      case 'daily':
        return (
          <DailyView 
            tasks={displayTasks} 
            onSelectTask={setSelectedTask} 
            onUpdateTask={updateTask}
            onBulkUpdateTasks={bulkUpdateTasks}
            onDeleteTask={deleteTask}
            onAddTask={addTask}
            onOpenManualAdd={handleOpenManualAdd}
            onMascotAction={triggerMascotAction}
          />
        );
      case 'overdue':
        return (
            <OverdueView
                tasks={displayTasks}
                onSelectTask={setSelectedTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onBulkDeleteTask={bulkDeleteTasks}
            />
        );
      case 'goals':
        return (
            <GoalsView 
                tasks={displayTasks}
                expenses={expenses}
            />
        );
      case 'social':
        return <SocialMediaView />;
      case 'weekly':
        return (
          <WeeklyView 
            tasks={displayTasks} 
            onSelectTask={setSelectedTask} 
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        );
      case 'monthly':
        return <MonthlyView tasks={displayTasks} />;
      case 'canvas':
        return <CanvasView />;
      case 'finance':
        return (
          <FinanceView 
            expenses={expenses}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onDeleteExpense={deleteExpense}
            isTableMissing={isTableMissing}
            userProfile={profile}
            onUpdateProfile={updateUserProfile}
          />
        );
      case 'journal':
        return (
          <JournalView 
            tasks={displayTasks} 
            journals={journals} 
            expenses={expenses}
            createOrUpdateJournal={createOrUpdateJournal} 
            downloadJournal={downloadJournal}
            deleteJournal={deleteJournal}
          />
        );
      case 'settings':
        return (
            <SettingsView 
                user={session?.user || null} 
                profile={profile} 
                onUpdateProfile={updateUserProfile} 
                onDeleteAccountRequest={handleDeleteAccountRequest}
            />
        );
      default:
        return <DailyView tasks={displayTasks} onSelectTask={setSelectedTask} onUpdateTask={updateTask} onBulkUpdateTasks={bulkUpdateTasks} onDeleteTask={deleteTask} onAddTask={addTask} onOpenManualAdd={handleOpenManualAdd} onMascotAction={triggerMascotAction} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        onLogoutRequest={handleLogoutRequest}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenShop={() => setIsShopOpen(true)}
      />
      
      <main className={`flex-1 overflow-y-auto w-full lg:ml-64 relative ${currentView === 'canvas' ? '' : 'pb-24'}`}>
        <div className="lg:hidden p-4 flex justify-between items-center bg-white dark:bg-slate-800 border-b dark:border-slate-700 sticky top-0 z-20">
            <div className="flex items-center space-x-2">
                <FlowmindIcon className="w-6 h-6 text-[#2563eb]"/>
                <span className="font-bold text-lg text-slate-800 dark:text-slate-200">Flowmind</span>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <MenuIcon className="w-6 h-6" />
            </button>
        </div>

        {renderView()}
        
        {currentView !== 'canvas' && (
            <div className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-30 flex flex-col gap-4 mb-20 lg:mb-0">
                <button
                    onClick={() => setIsAiAssistantOpen(!isAiAssistantOpen)}
                    data-tour-id="ai-assistant-button"
                    className="bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 p-3 sm:p-4 rounded-full shadow-lg hover:bg-purple-50 dark:hover:bg-slate-700 transition-all hover:scale-110 border border-purple-100 dark:border-slate-600"
                    title="Tanya AI Assistant"
                >
                    <SparklesBotIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>

                {currentView === 'daily' && (
                    <button
                        onClick={() => { setInitialTaskData(null); setAddModalOpen(true); }}
                        data-tour-id="add-task-button"
                        className="bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 hover:rotate-90"
                        title="Tambah Tugas Manual"
                    >
                        <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                )}
            </div>
        )}
      </main>

      {currentView !== 'canvas' && (
        <Mascot 
            tasks={tasks} 
            expenses={expenses} 
            recentAction={mascotAction} 
            equipped={profile?.equipped}
            isListening={isMusicPlaying}
            isPlayerExpanded={isMusicPlayerExpanded}
        />
      )}
      
      <MusicPlayer 
        onPlayStateChange={setIsMusicPlaying} 
        onExpandChange={setIsMusicPlayerExpanded}
        isFocusMode={!!focusTask && visibility === 'full'}
      />

      {isAddModalOpen && (
        <AddTaskModal
          onClose={() => setAddModalOpen(false)}
          onAddTask={addTask}
          tasks={tasks}
          initialData={initialTaskData}
          availableTags={availableTags}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          tasks={tasks}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onStartFocus={(task) => {
              startFocusSession(task);
              setSelectedTask(null);
          }}
        />
      )}
      
      {focusTask && <FocusMode streak={streakStats.count} />}
      
      {isAiAssistantOpen && <AiAssistant onClose={() => setIsAiAssistantOpen(false)} />}
      
      {showTour && (
        <OnboardingTour 
            onClose={handleTourClose} 
            onStepChange={(step) => {
                if (step === 2) setIsSidebarOpen(true);
            }}
        />
      )}

      {showLogoutConfirm && (
        <ConfirmationModal
            title="Konfirmasi Keluar"
            message="Apakah Anda yakin ingin keluar dari akun Anda?"
            confirmText="Ya, Keluar"
            onConfirm={handleLogoutConfirm}
            onCancel={() => setShowLogoutConfirm(false)}
            isDestructive={true}
        />
      )}
      
      <InstallPwaPrompt 
        isVisible={showInstallPrompt} 
        isIos={isIos} 
        onInstall={triggerInstall} 
        onClose={() => setShowInstallPrompt(false)}
      />
      
      {showPermissionWizard && (
          <PermissionWizard 
            onRequestNotificationPermission={requestNotificationPermission}
            onRequestMicPermission={async () => {}} 
            onClose={handlePermissionWizardClose}
          />
      )}
      
      {isDeleteAccountModalOpen && (
          <DeleteAccountModal 
            onClose={() => setDeleteAccountModalOpen(false)} 
            onConfirmDelete={handleDeleteAccountConfirm} 
          />
      )}
      
      {showDeleteSuccess && (
          <DeleteSuccessModal onClose={() => { setShowDeleteSuccess(false); window.location.reload(); }} />
      )}

      {isShopOpen && (
          <GamificationShopModal onClose={() => setIsShopOpen(false)} />
      )}

      {/* FATE CARD MODAL */}
      {showFateModal && (
          <DailyFateModal onSelectCard={handleSelectFateCard} />
      )}

    </div>
  );
};

const App: FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <FocusTimerProvider profile={profile}>
      <AppContent />
    </FocusTimerProvider>
  );
};

export default App;