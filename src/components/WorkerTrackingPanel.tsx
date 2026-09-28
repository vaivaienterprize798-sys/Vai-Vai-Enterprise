import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Printer,
  Share2,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronRight,
  TrendingUp,
  Boxes,
  ShieldAlert,
  Calendar,
  Filter,
  Play,
  Pause,
  Award,
  Sparkles,
  ListCheck,
  UserCheck,
} from 'lucide-react';
import {
  Staff,
  WorkerTaskRecord,
  WorkerDamageRecord,
  WorkerTaskStatus,
  Language,
  DEFAULT_COMPANY,
  SupervisorSampleRecord,
  ExtractedProductItem,
  WorkerProductConversion,
} from '../types';
import {
  translations,
  formatNumber,
  formatDate,
  formatCurrency,
} from '../lib/translations';
import { storageService } from '../lib/storage';
import { WhatsAppShareDropdown } from './WhatsAppShareDropdown';

interface WorkerTrackingPanelProps {
  staff: Staff[];
  workerTasks: WorkerTaskRecord[];
  lang: Language;
  onSaveTask: (task: WorkerTaskRecord) => void;
  onDeleteTask?: (id: string) => void;
  onPrintWorkerStatement?: (workerId?: string) => void;
  isSuperAdmin?: boolean;
  workerConversions?: WorkerProductConversion[];
  onSaveWorkerConversion?: (conversion: WorkerProductConversion) => void;
  onDeleteWorkerConversion?: (id: string) => void;
  onSaveStaff?: (staff: Staff) => void;
}

export const WorkerTrackingPanel: React.FC<WorkerTrackingPanelProps> = ({
  staff,
  workerTasks,
  lang,
  onSaveTask,
  onDeleteTask,
  onPrintWorkerStatement,
  isSuperAdmin = true,
  workerConversions,
  onSaveWorkerConversion,
  onDeleteWorkerConversion,
  onSaveStaff,
}) => {
  const t = translations[lang];
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter processing staff only
  const processingStaff = useMemo(() => {
    return staff.filter((s) => s.category === 'processing');
  }, [staff]);

  // Identify Head Supervisor & Unlimited Team Workers
  const supervisor = useMemo(() => {
    return (
      processingStaff.find((s) => s.isSupervisor) ||
      processingStaff[0] ||
      null
    );
  }, [processingStaff]);

  // Unlimited Workers - No fixed 5-worker restriction
  const supervisorTeam = useMemo(() => {
    if (!supervisor) return processingStaff;
    return processingStaff.filter((s) => s.id !== supervisor.id);
  }, [processingStaff, supervisor]);

  // Navigation Tabs (Added conversions tab for product conversion & yield tracking)
  const [activeTab, setActiveTab] = useState<'tasks' | 'damages' | 'conversions' | 'summary' | 'supervisor'>('tasks');

  // Filters
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkerTaskRecord | null>(null);

  // New Task Form State
  const [formWorkerId, setFormWorkerId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formProductName, setFormProductName] = useState<string>('');
  const [formBatchNo, setFormBatchNo] = useState<string>('');
  const [formGivenPcs, setFormGivenPcs] = useState<number>(0);
  const [formStartTime, setFormStartTime] = useState<string>('09:30 AM');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formIsSample, setFormIsSample] = useState<boolean>(false);
  const [formExtractedItems, setFormExtractedItems] = useState<ExtractedProductItem[]>([]);

  // Delivery Form State
  const [deliveredPcsInput, setDeliveredPcsInput] = useState<number>(0);
  const [deliveryStatus, setDeliveryStatus] = useState<WorkerTaskStatus>('in_progress');
  const [deliveryCompletionTime, setDeliveryCompletionTime] = useState<string>('05:30 PM');
  const [deliveryDurationMins, setDeliveryDurationMins] = useState<number>(480);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [deliveryExtractedItems, setDeliveryExtractedItems] = useState<ExtractedProductItem[]>([]);

  // Damage Form State
  const [damagePcsInput, setDamagePcsInput] = useState<number>(0);
  const [damageReason, setDamageReason] = useState<string>('বোর্ড ক্র্যাক ও ভুল ডিসোল্ডারিং');
  const [damagePenalty, setDamagePenalty] = useState<number>(0);
  const [damageNotes, setDamageNotes] = useState<string>('');

  // Extracted item helpers for New Task Modal
  const handleAddFormExtractedItem = (name = '', qty = 0, unit: 'pcs' | 'kg' | 'gm' = 'pcs') => {
    setFormExtractedItems((prev) => [
      ...prev,
      { id: `ext-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, name, quantity: qty, unit },
    ]);
  };

  const handleRemoveFormExtractedItem = (id: string) => {
    setFormExtractedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateFormExtractedItem = (id: string, field: keyof ExtractedProductItem, val: any) => {
    setFormExtractedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: field === 'quantity' ? Number(val) || 0 : val } : it))
    );
  };

  // Extracted item helpers for Delivery Modal
  const handleAddDeliveryExtractedItem = (name = '', qty = 0, unit: 'pcs' | 'kg' | 'gm' = 'pcs') => {
    setDeliveryExtractedItems((prev) => [
      ...prev,
      { id: `ext-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, name, quantity: qty, unit },
    ]);
  };

  const handleRemoveDeliveryExtractedItem = (id: string) => {
    setDeliveryExtractedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateDeliveryExtractedItem = (id: string, field: keyof ExtractedProductItem, val: any) => {
    setDeliveryExtractedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: field === 'quantity' ? Number(val) || 0 : val } : it))
    );
  };

  // Supervisor Sample Form State
  const [sampleName, setSampleName] = useState<string>('');
  const [sampleTestedQty, setSampleTestedQty] = useState<number>(0);
  const [samplePassedQty, setSamplePassedQty] = useState<number>(0);
  const [sampleFailedQty, setSampleFailedQty] = useState<number>(0);
  const [sampleStatus, setSampleStatus] = useState<'passed' | 'failed' | 'conditional'>('passed');
  const [sampleNotes, setSampleNotes] = useState<string>('');
  const [supervisorSamples, setSupervisorSamples] = useState<SupervisorSampleRecord[]>(() =>
    storageService.getSupervisorSamples()
  );

  // Worker Product Conversion State (Dynamic Product Conversion & Yield Tracking)
  const [localConversions, setLocalConversions] = useState<WorkerProductConversion[]>(() =>
    storageService.getWorkerConversions()
  );
  const conversionsList = workerConversions !== undefined ? workerConversions : localConversions;
  const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
  const [editingConversion, setEditingConversion] = useState<WorkerProductConversion | null>(null);
  const [convDate, setConvDate] = useState(todayStr);
  const [convWorkerId, setConvWorkerId] = useState('');
  const [convInputProduct, setConvInputProduct] = useState('');
  const [convInputQty, setConvInputQty] = useState<number>(1);
  const [convInputUnit, setConvInputUnit] = useState<'pcs' | 'kg'>('pcs');
  const [convOutputProduct, setConvOutputProduct] = useState('');
  const [convOutputQty, setConvOutputQty] = useState<number>(1);
  const [convOutputUnit, setConvOutputUnit] = useState<'pcs' | 'kg'>('pcs');
  const [convWastageOrLoss, setConvWastageOrLoss] = useState<number>(0);
  const [convExtractedSummary, setConvExtractedSummary] = useState('');
  const [convNotes, setConvNotes] = useState('');

  // Quick New Worker Modal State (Unlimited Worker Additions on Any Day)
  const [isNewWorkerModalOpen, setIsNewWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerDesignation, setNewWorkerDesignation] = useState('প্রসেসিং কারিগর');
  const [newWorkerDailyRate, setNewWorkerDailyRate] = useState<number>(500);
  const [newWorkerMonthlySalary, setNewWorkerMonthlySalary] = useState<number>(15000);

  const handleOpenNewConversion = (workerId?: string) => {
    setEditingConversion(null);
    setConvDate(todayStr);
    setConvWorkerId(workerId || (processingStaff[0]?.id || ''));
    setConvInputProduct('64GB Motherboard / Circuit');
    setConvInputQty(1);
    setConvInputUnit('pcs');
    setConvOutputProduct('32GB Motherboard / Circuit');
    setConvOutputQty(2);
    setConvOutputUnit('pcs');
    setConvWastageOrLoss(0);
    setConvExtractedSummary('2x 32GB ICs, Sub-board components');
    setConvNotes('');
    setIsConversionModalOpen(true);
  };

  const handleOpenEditConversion = (conv: WorkerProductConversion) => {
    setEditingConversion(conv);
    setConvDate(conv.date);
    setConvWorkerId(conv.workerId);
    setConvInputProduct(conv.inputProduct);
    setConvInputQty(conv.inputQty);
    setConvInputUnit(conv.inputUnit);
    setConvOutputProduct(conv.outputProduct);
    setConvOutputQty(conv.outputQty);
    setConvOutputUnit(conv.outputUnit);
    setConvWastageOrLoss(conv.wastageOrLoss || 0);
    setConvExtractedSummary(conv.extractedPartsSummary || '');
    setConvNotes(conv.notes || '');
    setIsConversionModalOpen(true);
  };

  const handleSaveConversionForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convInputProduct.trim() || !convOutputProduct.trim() || convInputQty <= 0 || convOutputQty <= 0) {
      alert(lang === 'bn' ? 'ইনপুট ও আউটপুট পণ্যের নাম এবং পরিমাণ সঠিকভাবে পূরণ করুন।' : 'Please enter valid input/output details.');
      return;
    }
    const workerObj = staff.find((s) => s.id === convWorkerId);
    const workerName = workerObj ? workerObj.name : 'Unknown Worker';

    const conversionToSave: WorkerProductConversion = {
      id: editingConversion ? editingConversion.id : `wcv-${Date.now()}`,
      date: convDate,
      workerId: convWorkerId,
      workerName: workerName,
      inputProduct: convInputProduct.trim(),
      inputQty: Number(convInputQty),
      inputUnit: convInputUnit,
      outputProduct: convOutputProduct.trim(),
      outputQty: Number(convOutputQty),
      outputUnit: convOutputUnit,
      wastageOrLoss: Number(convWastageOrLoss) || 0,
      extractedPartsSummary: convExtractedSummary.trim(),
      notes: convNotes.trim(),
      createdAt: editingConversion ? editingConversion.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveWorkerConversion) {
      onSaveWorkerConversion(conversionToSave);
    } else {
      storageService.saveWorkerConversion(conversionToSave);
      setLocalConversions(storageService.getWorkerConversions());
    }
    setIsConversionModalOpen(false);
    setEditingConversion(null);
  };

  const handleDeleteConversion = async (id: string) => {
    if (confirm(lang === 'bn' ? 'কনভার্শন রেকর্ডটি মুছে ফেলতে চান?' : 'Delete this conversion record?')) {
      if (onDeleteWorkerConversion) {
        onDeleteWorkerConversion(id);
      } else {
        await storageService.deleteWorkerConversion(id);
        setLocalConversions(storageService.getWorkerConversions());
      }
    }
  };

  const handleSaveNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) {
      alert(lang === 'bn' ? 'কারিগরের নাম আবশ্যক' : 'Worker name is required');
      return;
    }
    const newStaff: Staff = {
      id: `stf-${Date.now()}`,
      name: newWorkerName.trim(),
      phone: newWorkerPhone.trim(),
      designation: newWorkerDesignation.trim() || 'প্রসেসিং কারিগর',
      category: 'processing',
      baseSalary: Number(newWorkerMonthlySalary) || 15000,
      dailyRate: Number(newWorkerDailyRate) || 500,
      joinDate: todayStr,
      active: true,
      loginCode: `STF0${staff.length + 1}`,
      password: '123456',
      role: 'staff',
    };
    if (onSaveStaff) {
      onSaveStaff(newStaff);
    } else {
      storageService.saveStaff(newStaff);
    }
    setIsNewWorkerModalOpen(false);
    setNewWorkerName('');
    setNewWorkerPhone('');
  };

  // Live timer tick for active tasks
  const [nowTs, setNowTs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 30000); // 30 sec tick
    return () => clearInterval(timer);
  }, []);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return workerTasks.filter((task) => {
      if (selectedWorkerId !== 'all' && task.workerId !== selectedWorkerId) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = task.workerName.toLowerCase().includes(q);
        const matchProduct = task.productName.toLowerCase().includes(q);
        const matchBatch = (task.batchNo || '').toLowerCase().includes(q);
        if (!matchName && !matchProduct && !matchBatch) return false;
      }
      return true;
    });
  }, [workerTasks, selectedWorkerId, statusFilter, searchTerm]);

  // Aggregated Overall KPIs
  const kpis = useMemo(() => {
    const totalGiven = workerTasks.reduce((s, t) => s + t.givenPcs, 0);
    const totalCompleted = workerTasks.reduce((s, t) => s + t.completedPcs, 0);
    const totalDamaged = workerTasks.reduce((s, t) => s + t.damagedPcs, 0);
    const totalRemaining = Math.max(0, totalGiven - totalCompleted - totalDamaged);
    const damageRate = totalGiven > 0 ? ((totalDamaged / totalGiven) * 100).toFixed(1) : '0';

    let totalPenalties = 0;
    workerTasks.forEach((t) => {
      t.damages?.forEach((d) => {
        totalPenalties += Number(d.penaltyAmount) || 0;
      });
    });

    return {
      totalWorkers: processingStaff.length,
      totalGiven,
      totalCompleted,
      totalRemaining,
      totalDamaged,
      totalPenalties,
      damageRate,
      activeTasks: workerTasks.filter((t) => t.status === 'in_progress' || t.status === 'assigned').length,
    };
  }, [workerTasks, processingStaff]);

  // Worker-by-Worker Aggregated Performance
  const workerPerformances = useMemo(() => {
    return processingStaff.map((w) => {
      const tasks = workerTasks.filter((t) => t.workerId === w.id);
      const given = tasks.reduce((s, t) => s + t.givenPcs, 0);
      const completed = tasks.reduce((s, t) => s + t.completedPcs, 0);
      const damaged = tasks.reduce((s, t) => s + t.damagedPcs, 0);
      const remaining = Math.max(0, given - completed - damaged);
      const rate = given > 0 ? ((damaged / given) * 100).toFixed(1) : '0';
      const efficiency = given > 0 ? (((completed) / given) * 100).toFixed(1) : '0';

      let workerPenalties = 0;
      tasks.forEach((t) => {
        t.damages?.forEach((d) => {
          workerPenalties += Number(d.penaltyAmount) || 0;
        });
      });

      return {
        ...w,
        taskCount: tasks.length,
        given,
        completed,
        damaged,
        remaining,
        workerPenalties,
        damageRate: rate,
        efficiency,
      };
    });
  }, [processingStaff, workerTasks]);

  // Supervisor Team KPIs
  const supervisorTeamKpis = useMemo(() => {
    const teamMemberIds = new Set(supervisorTeam.map((m) => m.id));
    const teamTasks = workerTasks.filter((t) => teamMemberIds.has(t.workerId) || t.supervisorId === supervisor.id);

    const totalGiven = teamTasks.reduce((s, t) => s + t.givenPcs, 0);
    const totalCompleted = teamTasks.reduce((s, t) => s + t.completedPcs, 0);
    const totalDamaged = teamTasks.reduce((s, t) => s + t.damagedPcs, 0);
    const totalRemaining = Math.max(0, totalGiven - totalCompleted - totalDamaged);

    let totalPenalties = 0;
    teamTasks.forEach((t) => {
      t.damages?.forEach((d) => {
        totalPenalties += Number(d.penaltyAmount) || 0;
      });
    });

    return {
      teamSize: supervisorTeam.length,
      taskCount: teamTasks.length,
      totalGiven,
      totalCompleted,
      totalRemaining,
      totalDamaged,
      totalPenalties,
    };
  }, [supervisorTeam, workerTasks, supervisor]);

  // All Damages Flattened for Damage Ledger
  const allDamages = useMemo(() => {
    const list: {
      taskId: string;
      workerName: string;
      workerId: string;
      productName: string;
      damage: WorkerDamageRecord;
    }[] = [];

    workerTasks.forEach((t) => {
      if (t.damages && t.damages.length > 0) {
        t.damages.forEach((d) => {
          if (selectedWorkerId === 'all' || t.workerId === selectedWorkerId) {
            list.push({
              taskId: t.id,
              workerName: t.workerName,
              workerId: t.workerId,
              productName: t.productName,
              damage: d,
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.damage.date).getTime() - new Date(a.damage.date).getTime());
  }, [workerTasks, selectedWorkerId]);

  // Handlers
  const handleOpenNewTask = (preselectedWorkerId?: string) => {
    setFormWorkerId(preselectedWorkerId || processingStaff[0]?.id || '');
    setFormDate(todayStr);
    setFormProductName('');
    setFormBatchNo(`BATCH-${new Date().getFullYear()}-${String(workerTasks.length + 1).padStart(2, '0')}`);
    setFormGivenPcs(0);
    setFormStartTime('09:30 AM');
    setFormNotes('');
    setFormIsSample(false);
    setFormExtractedItems([]);
    setIsNewTaskModalOpen(true);
  };

  const handleSaveNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    const w = processingStaff.find((s) => s.id === formWorkerId);
    if (!w || !formProductName.trim() || formGivenPcs <= 0) {
      alert(lang === 'bn' ? 'সঠিক তথ্য প্রদান করুন' : 'Please provide valid information');
      return;
    }

    const validExtracted = formExtractedItems.filter((it) => it.name.trim() && it.quantity > 0);
    const summary = validExtracted.map((it) => `${it.name} (${it.quantity} ${it.unit})`).join(', ');

    const newTask: WorkerTaskRecord = {
      id: `tsk-${Date.now()}`,
      workerId: w.id,
      workerName: w.name,
      date: formDate || todayStr,
      productName: formProductName.trim(),
      batchNo: formBatchNo.trim(),
      givenPcs: Number(formGivenPcs),
      completedPcs: 0,
      damagedPcs: 0,
      status: 'assigned',
      startTime: formStartTime || '09:30 AM',
      supervisorId: supervisor?.id,
      supervisorName: supervisor?.name,
      isSampleBatch: formIsSample,
      extractedItems: validExtracted,
      extractedProductSummary: summary || undefined,
      damages: [],
      notes: formNotes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveTask(newTask);
    setIsNewTaskModalOpen(false);
  };

  const handleOpenDeliveryModal = (task: WorkerTaskRecord) => {
    setSelectedTask(task);
    setDeliveredPcsInput(task.completedPcs || 0);
    setDeliveryStatus(task.status);
    setDeliveryCompletionTime(
      task.completionTime ||
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    );
    setDeliveryDurationMins(task.durationMinutes || 480);
    setDeliveryNotes(task.notes || '');
    setDeliveryExtractedItems(
      task.extractedItems && task.extractedItems.length > 0
        ? [...task.extractedItems]
        : []
    );
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const newCompleted = Number(deliveredPcsInput) || 0;
    const remaining = Math.max(0, selectedTask.givenPcs - newCompleted - selectedTask.damagedPcs);
    const finalStatus: WorkerTaskStatus = remaining === 0 ? 'completed' : deliveryStatus;

    const validDeliveryExtracted = deliveryExtractedItems.filter((it) => it.name.trim() && it.quantity > 0);
    const summary = validDeliveryExtracted.map((it) => `${it.name} (${it.quantity} ${it.unit})`).join(', ');

    const updated: WorkerTaskRecord = {
      ...selectedTask,
      completedPcs: newCompleted,
      status: finalStatus,
      completionTime: deliveryCompletionTime,
      durationMinutes: Number(deliveryDurationMins) || selectedTask.durationMinutes || 480,
      extractedItems: validDeliveryExtracted.length > 0 ? validDeliveryExtracted : selectedTask.extractedItems,
      extractedProductSummary: summary || selectedTask.extractedProductSummary,
      notes: deliveryNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSaveTask(updated);
    setIsDeliveryModalOpen(false);
    setSelectedTask(null);
  };

  const handleOpenDamageModal = (task: WorkerTaskRecord) => {
    setSelectedTask(task);
    setDamagePcsInput(0);
    setDamageReason('বোর্ড ক্র্যাক ও ভুল ডিসোল্ডারিং');
    setDamagePenalty(0);
    setDamageNotes('');
    setIsDamageModalOpen(true);
  };

  const handleSaveDamage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || damagePcsInput <= 0) return;

    const penaltyVal = Number(damagePenalty) || 0;
    const newDamageRecord: WorkerDamageRecord = {
      id: `dmg-${Date.now()}`,
      date: todayStr,
      damagedPcs: Number(damagePcsInput),
      reason: damageReason.trim(),
      penaltyAmount: penaltyVal,
      notes: damageNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedDamages = [...(selectedTask.damages || []), newDamageRecord];
    const newTotalDamaged = updatedDamages.reduce((s, d) => s + d.damagedPcs, 0);
    const remaining = Math.max(0, selectedTask.givenPcs - selectedTask.completedPcs - newTotalDamaged);

    const updated: WorkerTaskRecord = {
      ...selectedTask,
      damagedPcs: newTotalDamaged,
      damages: updatedDamages,
      status: remaining === 0 ? 'completed' : selectedTask.status,
      updatedAt: new Date().toISOString(),
    };

    onSaveTask(updated);
    setIsDamageModalOpen(false);
    setSelectedTask(null);
  };

  // Live Timer Handlers
  const handleStartTimer = (task: WorkerTaskRecord) => {
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const updated: WorkerTaskRecord = {
      ...task,
      status: 'in_progress',
      startTime: task.startTime || nowStr,
      timerStartedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveTask(updated);
  };

  const handleStopTimer = (task: WorkerTaskRecord) => {
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    let addedMins = 0;
    if (task.timerStartedAt) {
      const diffMs = Date.now() - new Date(task.timerStartedAt).getTime();
      addedMins = Math.max(1, Math.round(diffMs / 60000));
    }
    const currentMins = task.durationMinutes || 0;
    const updated: WorkerTaskRecord = {
      ...task,
      completionTime: nowStr,
      durationMinutes: currentMins + addedMins,
      timerStartedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    onSaveTask(updated);
  };

  // Supervisor Sample Test Handlers
  const handleOpenSampleModal = () => {
    setSampleName('');
    setSampleTestedQty(0);
    setSamplePassedQty(0);
    setSampleFailedQty(0);
    setSampleStatus('passed');
    setSampleNotes('');
    setIsSampleModalOpen(true);
  };

  const handleSaveSampleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleName.trim()) return;

    const newSample: SupervisorSampleRecord = {
      id: `smp-${Date.now()}`,
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      date: todayStr,
      sampleName: sampleName.trim(),
      testedQty: Number(sampleTestedQty) || 10,
      passedQty: Number(samplePassedQty) || 0,
      failedQty: Number(sampleFailedQty) || 0,
      status: sampleStatus,
      notes: sampleNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    storageService.saveSupervisorSample(newSample);
    setSupervisorSamples(storageService.getSupervisorSamples());
    setIsSampleModalOpen(false);
  };

  const handleDeleteSample = async (id: string) => {
    if (confirm(lang === 'bn' ? 'স্যাম্পল টেস্ট রেকর্ড মুছে ফেলবেন?' : 'Delete sample record?')) {
      await storageService.deleteSupervisorSample(id);
      setSupervisorSamples(storageService.getSupervisorSamples());
    }
  };

  const handleDeleteTask = (task: WorkerTaskRecord) => {
    if (confirm(lang === 'bn' ? `আপনি কি নিশ্চিতভাবে "${task.productName}" টাস্কটি মুছে ফেলতে চান?` : 'Are you sure you want to delete this task?')) {
      if (onDeleteTask) {
        onDeleteTask(task.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {lang === 'bn' ? 'প্রোসেসিং ওয়ার্কার ট্র্যাকিং, সুপারভাইজার & ড্যামেজ কন্ট্রোল' : 'Processing Worker & Wastage Tracking'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {lang === 'bn'
              ? 'কারিগরদের মাল প্রদান (PCS Given), ডেলিভারি, সময় ট্র্যাকিং, সুপারভাইজার মনিটরিং এবং ড্যামেজ বেতন কর্তন'
              : 'Track given PCS, time duration, supervisor multi-staff queue, and damage salary penalties'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppShareDropdown
            lang={lang}
            buttonLabel={t.shareWhatsApp}
            getText={() => {
              return `*${DEFAULT_COMPANY.name} - কারিগর প্রসেসিং ও ড্যামেজ রিপোর্ট*\n📅 তারিখ: ${todayStr}\n────────────────────────\n👥 মোট কারিগর: ${kpis.totalWorkers} জন\n📦 মোট মাল দেওয়া: ${kpis.totalGiven} PCS\n✅ সম্পন্ন ডেলিভারি: ${kpis.totalCompleted} PCS\n⏳ বর্তমান অবশিষ্ট: ${kpis.totalRemaining} PCS\n⚠️ মোট ড্যামেজ: ${kpis.totalDamaged} PCS (${kpis.damageRate}%)\n💸 মোট জরিমানা কর্তন: ৳${kpis.totalPenalties.toLocaleString()}\n────────────────────────\n_${DEFAULT_COMPANY.name}_`;
            }}
          />

          {onPrintWorkerStatement && (
            <button
              onClick={() => onPrintWorkerStatement(selectedWorkerId !== 'all' ? selectedWorkerId : undefined)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'ওয়ার্কার রিপোর্ট প্রিন্ট' : 'Print Statement'}</span>
            </button>
          )}

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setIsNewWorkerModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>{lang === 'bn' ? '+ নতুন কারিগর যোগ' : '+ Add Worker'}</span>
              </button>

              <button
                onClick={() => handleOpenNewTask()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'bn' ? 'নতুন মাল / কাজ এন্ট্রি' : 'Assign New Batch'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 block">
            {lang === 'bn' ? 'মোট মাল দেওয়া (Given)' : 'Total Given PCS'}
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
            {formatNumber(kpis.totalGiven, lang)} <span className="text-xs font-normal">PCS</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 block">
            {lang === 'bn' ? 'সম্পন্ন ডেলিভারি (Delivered)' : 'Delivered PCS'}
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatNumber(kpis.totalCompleted, lang)} <span className="text-xs font-normal">PCS</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20">
          <span className="text-[10px] sm:text-[11px] font-semibold text-blue-800 dark:text-blue-400 block">
            {lang === 'bn' ? 'অবশিষ্ট কাজ (Remaining)' : 'Remaining Queue'}
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            {formatNumber(kpis.totalRemaining, lang)} <span className="text-xs font-normal">PCS</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
          <span className="text-[10px] sm:text-[11px] font-semibold text-rose-800 dark:text-rose-400 block">
            {lang === 'bn' ? 'মোট ড্যামেজ (Damaged)' : 'Damaged PCS'}
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {formatNumber(kpis.totalDamaged, lang)} <span className="text-xs font-normal">PCS ({kpis.damageRate}%)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20">
          <span className="text-[10px] sm:text-[11px] font-semibold text-purple-800 dark:text-purple-400 block">
            {lang === 'bn' ? 'বেতন কর্তন (Penalty Deducted)' : 'Salary Penalties'}
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
            {formatCurrency(kpis.totalPenalties, lang)}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'tasks'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{lang === 'bn' ? 'টাস্ক, টাইম & ডেলিভারি খাতা' : 'Task & Delivery Ledger'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {workerTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('damages')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'damages'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{lang === 'bn' ? 'ড্যামেজ & পে-রোল জরিমানা লগ' : 'Wastage & Penalty Log'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
            {allDamages.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('conversions')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'conversions'
              ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'bn' ? 'পণ্য রূপান্তর & আউটপুট ট্র্যাকিং' : 'Output Conversions'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold">
            {conversionsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'summary'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'bn' ? 'কারিগর সামারি কার্ড' : 'Worker Performance Cards'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            {processingStaff.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('supervisor')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'supervisor'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{lang === 'bn' ? 'সুপারভাইজার & টিম মনিটরিং' : 'Supervisor & Team Monitoring'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
            1 Lead + {supervisorTeam.length} Staff
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      {activeTab !== 'supervisor' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold cursor-pointer"
            >
              <option value="all">{lang === 'bn' ? 'সকল প্রসেসিং কারিগর' : 'All Workers'}</option>
              {processingStaff.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.designation})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold cursor-pointer"
            >
              <option value="all">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
              <option value="assigned">বরাদ্দকৃত (Assigned)</option>
              <option value="in_progress">চলমান (In Progress)</option>
              <option value="completed">সম্পন্ন (Completed)</option>
              <option value="on_hold">স্থগিত (On Hold)</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'bn' ? 'নাম, পণ্য বা ব্যাচ নম্বর দিয়ে খুঁজুন...' : 'Search worker, product or batch...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* TAB 1: Tasks & Delivery Ledger */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">{lang === 'bn' ? 'তারিখ & সময়' : 'Date & Time'}</th>
                  <th className="p-3.5">ব্যাচ নং</th>
                  <th className="p-3.5">কারিগর (Worker)</th>
                  <th className="p-3.5">{lang === 'bn' ? 'উৎস পণ্য ➔ কী আইটেম ও কত পিস বের হলো' : 'Source ➔ Extracted Output & PCS'}</th>
                  <th className="p-3.5 text-center">দেওয়া (Given)</th>
                  <th className="p-3.5 text-center">ডেলিভারি (Delivered)</th>
                  <th className="p-3.5 text-center text-rose-600">ড্যামেজ (Damaged)</th>
                  <th className="p-3.5 text-center text-blue-600">অবশিষ্ট (Remaining)</th>
                  <th className="p-3.5 text-center">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="p-3.5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'কোনো টাস্ক বা কাজের রেকর্ড পাওয়া যায়নি।' : 'No tasks found.'}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const remaining = Math.max(0, task.givenPcs - task.completedPcs - task.damagedPcs);
                    const isRunning = Boolean(task.timerStartedAt);

                    return (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3.5 font-mono">
                          <div>{formatDate(task.date, lang)}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{task.startTime || '09:30 AM'}</span>
                            {task.durationMinutes ? <span>({task.durationMinutes}m)</span> : null}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          {task.batchNo || '-'}
                          {task.isSampleBatch && (
                            <span className="block text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold w-max mt-0.5">
                              Sample Test
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 font-semibold">
                          <div>{task.workerName}</div>
                          {task.supervisorName && (
                            <div className="text-[10px] text-slate-400">Sup: {task.supervisorName}</div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{task.productName}</span>
                          </div>

                          {/* Extracted products yield breakdown */}
                          {task.extractedItems && task.extractedItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {task.extractedItems.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold"
                                >
                                  <span>⚙️ {it.name}:</span>
                                  <strong>{it.quantity} {it.unit}</strong>
                                </span>
                              ))}
                            </div>
                          ) : task.extractedProductSummary ? (
                            <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                              <span>⚙️</span>
                              <span>{task.extractedProductSummary}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              {lang === 'bn' ? 'আউটপুট প্রসেসিং চলছে' : 'Extraction pending'}
                            </div>
                          )}

                          {task.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">{task.notes}</div>}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {task.givenPcs}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {task.completedPcs}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                          {task.damagedPcs}
                        </td>

                        <td className="p-3.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {remaining}
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : task.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {task.status === 'completed' ? 'সম্পন্ন' : task.status === 'in_progress' ? 'চলমান' : 'বরাদ্দকৃত'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Live Timer Start/Stop Button */}
                            {task.status !== 'completed' && (
                              <button
                                onClick={() => (isRunning ? handleStopTimer(task) : handleStartTimer(task))}
                                title={isRunning ? 'টাইমার স্টপ করুন' : 'সময় গণনা শুরু করুন'}
                                className={`p-1.5 rounded-lg text-white font-bold cursor-pointer transition-all ${
                                  isRunning ? 'bg-rose-600 hover:bg-rose-500 animate-bounce' : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                              >
                                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenDeliveryModal(task)}
                              title="কাজ জমা / ডেলিভারি দিন"
                              className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer font-bold text-[11px] flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ডেলিভারি</span>
                            </button>

                            <button
                              onClick={() => handleOpenDamageModal(task)}
                              title="ড্যামেজ এন্ট্রি করুন"
                              className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer font-bold text-[11px] flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>ড্যামেজ</span>
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task)}
                              title="মুছে ফেলুন"
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Damage & Penalty Ledger */}
      {activeTab === 'damages' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in duration-150 space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>ড্যামেজ, অপচয় ও বেতন কর্তন রেজিস্টার (Damage & Penalty Ledger)</span>
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'নষ্ট হওয়া মালের ক্ষতি এবং কারিগরের বেতন থেকে কর্তনকৃত জরিমানার সরাসরি হিসাব'
                  : 'Product damage records with applicable salary penalties'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
              {allDamages.length} {lang === 'bn' ? 'টি রেকর্ড' : 'Records'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="p-3.5">কারিগর (Worker)</th>
                  <th className="p-3.5">বোর্ড / পণ্য</th>
                  <th className="p-3.5 text-center text-rose-600">নষ্ট পিস (Damaged PCS)</th>
                  <th className="p-3.5">ড্যামেজ কারণ (Reason)</th>
                  <th className="p-3.5 text-right font-bold text-purple-600">বেতন কর্তন / জরিমানা (৳)</th>
                  <th className="p-3.5">মন্তব্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {allDamages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {lang === 'bn' ? 'কোনো ড্যামেজ রেকর্ড নেই। আলহামদুলিল্লাহ!' : 'No damage records found.'}
                    </td>
                  </tr>
                ) : (
                  allDamages.map((item, idx) => (
                    <tr key={`${item.taskId}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3.5 font-mono">{formatDate(item.damage.date, lang)}</td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{item.workerName}</td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{item.productName}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {item.damage.damagedPcs} PCS
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          {item.damage.reason}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                        {item.damage.penaltyAmount && item.damage.penaltyAmount > 0 ? (
                          <span>-{formatCurrency(item.damage.penaltyAmount, lang)}</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">ক্ষমা / মওকুফ</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate">{item.damage.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Product Conversion & Yield Output Tracking */}
      {activeTab === 'conversions' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in duration-150 space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
                <span>{lang === 'bn' ? 'পণ্য রূপান্তর & আউটপুট ট্র্যাকিং খাতা' : 'Product Conversion & Output Yield Ledger'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'bn'
                  ? 'কোন কারিগর কোন মাল ভেঙে কী নতুন পণ্য উৎপাদন করেছে (যেমন: ১টি ৬৪জিবি থেকে ২টি ৩২জিবি বের করা) তার বিস্তারিত হিসাব'
                  : 'Track input materials converted into new output products per worker (e.g. 64GB into 2x 32GB)'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <WhatsAppShareDropdown
                lang={lang}
                buttonLabel={t.shareWhatsApp}
                getText={() => {
                  const summaryLines = conversionsList.slice(0, 10).map(
                    (c, i) => `${i + 1}. ${c.workerName}: ${c.inputProduct} (${c.inputQty} ${c.inputUnit}) ➔ ${c.outputProduct} (${c.outputQty} ${c.outputUnit})`
                  ).join('\n');
                  return `*${DEFAULT_COMPANY.name} - পণ্য রূপান্তর ও আউটপুট রিপোর্ট*\n📅 তারিখ: ${todayStr}\n────────────────────────\n🔄 মোট কনভার্শন: ${conversionsList.length} টি\n${summaryLines}\n────────────────────────\n_${DEFAULT_COMPANY.name}_`;
                }}
              />

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
              </button>

              <button
                onClick={() => handleOpenNewConversion()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'bn' ? '+ নতুন কনভার্শন এন্ট্রি' : '+ New Conversion'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics for Conversions */}
          {(() => {
            const relevantConversions = conversionsList.filter(
              (c) => selectedWorkerId === 'all' || c.workerId === selectedWorkerId
            );
            const totalInputs = relevantConversions.reduce((acc, c) => acc + (Number(c.inputQty) || 0), 0);
            const totalOutputs = relevantConversions.reduce((acc, c) => acc + (Number(c.outputQty) || 0), 0);
            const totalWastage = relevantConversions.reduce((acc, c) => acc + (Number(c.wastageOrLoss) || 0), 0);
            const yieldRatio = totalInputs > 0 ? (totalOutputs / totalInputs).toFixed(2) : '1.0';

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-xl border border-cyan-100 dark:border-cyan-900/40">
                  <span className="text-[10px] text-cyan-800 dark:text-cyan-300 font-bold block uppercase">
                    {lang === 'bn' ? 'মোট কনভার্শন রেকর্ড' : 'Total Conversions'}
                  </span>
                  <div className="text-lg font-black font-mono text-cyan-700 dark:text-cyan-300 mt-0.5">
                    {formatNumber(relevantConversions.length, lang)} {lang === 'bn' ? 'টি' : 'records'}
                  </div>
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block uppercase">
                    {lang === 'bn' ? 'ব্যবহৃত ইনপুট মাল' : 'Processed Input'}
                  </span>
                  <div className="text-lg font-black font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                    {formatNumber(totalInputs, lang)} <span className="text-xs font-normal">PCS</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block uppercase">
                    {lang === 'bn' ? 'উৎপাদিত নতুন আউটপুট' : 'Yielded Output'}
                  </span>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {formatNumber(totalOutputs, lang)} <span className="text-xs font-normal">PCS</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40">
                  <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold block uppercase">
                    {lang === 'bn' ? 'গড় রূপান্তর আউটপুট হার' : 'Avg Output Yield Ratio'}
                  </span>
                  <div className="text-lg font-black font-mono text-purple-700 dark:text-purple-300 mt-0.5">
                    {yieldRatio}x
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Table of Conversions */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="p-3">{lang === 'bn' ? 'কারিগর' : 'Worker'}</th>
                  <th className="p-3">{lang === 'bn' ? 'ইনপুট পণ্য ও পরিমাণ' : 'Input Material'}</th>
                  <th className="p-3 text-cyan-600 dark:text-cyan-400">{lang === 'bn' ? 'উৎপাদিত নতুন আউটপুট' : 'Output Produced'}</th>
                  <th className="p-3">{lang === 'bn' ? 'এক্সট্রাক্ট পার্টস/উপাদান' : 'Extracted Components'}</th>
                  <th className="p-3 text-center text-rose-600">{lang === 'bn' ? 'অপচয় / লস' : 'Wastage'}</th>
                  <th className="p-3">{lang === 'bn' ? 'মন্তব্য' : 'Notes'}</th>
                  <th className="p-3 text-center">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {conversionsList
                  .filter((c) => selectedWorkerId === 'all' || c.workerId === selectedWorkerId)
                  .map((conv) => (
                    <tr key={conv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                        {conv.date}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                          <span>{conv.workerName}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{conv.inputProduct}</div>
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px] mt-0.5">
                          {formatNumber(conv.inputQty, lang)} {conv.inputUnit}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-cyan-700 dark:text-cyan-300">
                        <div>{conv.outputProduct}</div>
                        <span className="inline-block px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono font-black text-[11px] mt-0.5">
                          +{formatNumber(conv.outputQty, lang)} {conv.outputUnit}
                          {conv.inputQty > 0 && (
                            <span className="ml-1 text-[9px] opacity-80">
                              (১টিতে {((conv.outputQty / conv.inputQty)).toFixed(1)}টি)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">
                        {conv.extractedPartsSummary ? (
                          <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                            {conv.extractedPartsSummary}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-rose-600 font-bold">
                        {conv.wastageOrLoss ? `${formatNumber(conv.wastageOrLoss, lang)} ${conv.outputUnit}` : '০'}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {conv.notes || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditConversion(conv)}
                            title={lang === 'bn' ? 'কনভার্শন এডিট করুন' : 'Edit Conversion'}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const shareText = `*${DEFAULT_COMPANY.name} - পণ্য রূপান্তর ভাউচার*\n📅 তারিখ: ${conv.date}\n👤 কারিগর: ${conv.workerName}\n📥 ইনপুট: ${conv.inputProduct} (${conv.inputQty} ${conv.inputUnit})\n📤 নতুন আউটপুট: ${conv.outputProduct} (${conv.outputQty} ${conv.outputUnit})\n⚙️ অতিরিক্ত উপাদান: ${conv.extractedPartsSummary || 'N/A'}\n⚠️ অপচয়: ${conv.wastageOrLoss || 0} ${conv.outputUnit}\n${conv.notes ? `📝 মন্তব্য: ${conv.notes}\n` : ''}────────────────────────\n_${DEFAULT_COMPANY.name}_`;
                              const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                              window.open(url, '_blank');
                            }}
                            title={t.shareWhatsApp}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteConversion(conv.id)}
                              title={lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {conversionsList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-xs font-semibold">
                        {lang === 'bn' ? 'কোনো পণ্য রূপান্তর রেকর্ড এন্ট্রি করা হয়নি।' : 'No product conversions recorded yet.'}
                      </p>
                      <button
                        onClick={() => handleOpenNewConversion()}
                        className="mt-3 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'প্রথম কনভার্শন যোগ করুন' : 'Add First Conversion'}</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Worker Summary Cards */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-150">
          {workerPerformances.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5 shadow-xs hover:border-emerald-500 transition-all"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{w.name}</h4>
                  <p className="text-xs text-slate-500">{w.designation}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    দক্ষতা: {w.efficiency}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-400 block uppercase">দেওয়া</span>
                  <strong className="text-slate-900 dark:text-white">{w.given}</strong>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-300">
                  <span className="text-[10px] block uppercase">ডেলিভারি</span>
                  <strong>{w.completed}</strong>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-700 dark:text-blue-300">
                  <span className="text-[10px] block uppercase">বকেয়া</span>
                  <strong>{w.remaining}</strong>
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-700 dark:text-rose-300">
                  <span className="text-[10px] block uppercase">ড্যামেজ</span>
                  <strong>{w.damaged}</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex items-center justify-between text-xs">
                <span className="text-purple-900 dark:text-purple-300 font-semibold">
                  মাসিক পে-রোল ড্যামেজ কর্তন:
                </span>
                <strong className="font-mono text-purple-700 dark:text-purple-400 font-bold">
                  {formatCurrency(w.workerPenalties, lang)}
                </strong>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    setSelectedWorkerId(w.id);
                    setActiveTab('tasks');
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>টাস্ক খাতা দেখুন</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleOpenNewTask(w.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>মাল বরাদ্দ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Supervisor & Multi-Staff Team Monitoring Panel */}
      {activeTab === 'supervisor' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {!supervisor ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <h4 className="font-bold text-slate-800 dark:text-white text-base">
                {lang === 'bn' ? 'কোনো প্রসেসিং স্টাফ পাওয়া যায়নি' : 'No Processing Staff Found'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {lang === 'bn'
                  ? 'হাজিরা ও পে-রোল প্যানেল থেকে প্রসেসিং স্টাফ যোগ করুন বা কাউকে সুপারভাইজার হিসেবে চিহ্নিত করুন।'
                  : 'Please add processing staff members in the Payroll panel.'}
              </p>
            </div>
          ) : (
            <>
              {/* Supervisor Header Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-4 shadow-xl border border-indigo-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg">{supervisor.name}</h3>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase">
                          হেড সুপারভাইজার
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {supervisor.designation} • মোবাইল: {supervisor.phone}
                      </p>
                    </div>
                  </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenSampleModal}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  <span>স্যাম্পল টেস্ট লগার</span>
                </button>
                <button
                  onClick={() => handleOpenNewTask()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>টিমে কাজ বন্টন</span>
                </button>
              </div>
            </div>

            {/* Team High-Level Aggregated KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-white/10 text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">টিম মেম্বার</span>
                <strong className="text-base font-mono text-amber-300">{supervisorTeamKpis.teamSize} জন কারিগর</strong>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">টিমে মোট বরাদ্দ (Given)</span>
                <strong className="text-base font-mono text-white">{supervisorTeamKpis.totalGiven} PCS</strong>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">টিম ডেলিভারি (Completed)</span>
                <strong className="text-base font-mono text-emerald-400">{supervisorTeamKpis.totalCompleted} PCS</strong>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">অবশিষ্ট কিউ (Queue)</span>
                <strong className="text-base font-mono text-blue-300">{supervisorTeamKpis.totalRemaining} PCS</strong>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">টিম ড্যামেজ & জরিমানা</span>
                <strong className="text-base font-mono text-rose-400">
                  {supervisorTeamKpis.totalDamaged} PCS (৳{supervisorTeamKpis.totalPenalties})
                </strong>
              </div>
            </div>
          </div>

          {/* Unlimited Team Individual Real-time Monitoring Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{lang === 'bn' ? `সুপারভাইজার নিয়ন্ত্রিত সকল কারিগরের কাজ & টাইম মনিটরিং (${supervisorTeam.length} জন)` : `Team Real-time Monitoring (${supervisorTeam.length} Workers)`}</span>
              </h4>
              <button
                onClick={() => setIsNewWorkerModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? '+ কারিগর যোগ' : '+ Add Worker'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supervisorTeam.map((member, idx) => {
                const memberTasks = workerTasks.filter((t) => t.workerId === member.id);
                const activeTask = memberTasks.find((t) => t.status === 'in_progress' || t.status === 'assigned') || memberTasks[0];
                const given = memberTasks.reduce((s, t) => s + t.givenPcs, 0);
                const completed = memberTasks.reduce((s, t) => s + t.completedPcs, 0);
                const damaged = memberTasks.reduce((s, t) => s + t.damagedPcs, 0);
                const remaining = Math.max(0, given - completed - damaged);

                return (
                  <div
                    key={member.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs hover:border-purple-500 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-white text-sm">{member.name}</h5>
                          <span className="text-[10px] text-slate-400">{member.designation}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {memberTasks.length} টাস্ক
                      </span>
                    </div>

                    {/* Active Working Status */}
                    {activeTask ? (
                      <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl space-y-1.5 border border-purple-200/50 dark:border-purple-900/30 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span className="truncate max-w-[180px]">{activeTask.productName}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                              activeTask.status === 'in_progress' ? 'bg-blue-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                            }`}
                          >
                            {activeTask.status === 'in_progress' ? 'Running' : 'Assigned'}
                          </span>
                        </div>

                        <div className="flex justify-between font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          <span>বরাদ্দ: <strong>{activeTask.givenPcs} PCS</strong></span>
                          <span>জমা: <strong className="text-emerald-600">{activeTask.completedPcs} PCS</strong></span>
                          <span>নষ্ট: <strong className="text-rose-600">{activeTask.damagedPcs} PCS</strong></span>
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-purple-200/40">
                          <span>স্টার্ট টাইম: {activeTask.startTime || '09:30 AM'}</span>
                          <span>ডিউরেশন: {activeTask.durationMinutes ? `${activeTask.durationMinutes}m` : '0m'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
                        কোনো সক্রিয় টাস্ক নেই। নতুন কাজের জন্য প্রস্তুত।
                      </div>
                    )}

                    {/* Performance Summary Strip */}
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="text-[9px] text-slate-400 block">মোট প্রাপ্ত</span>
                        <strong>{given} PCS</strong>
                      </div>
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-700 dark:text-emerald-300">
                        <span className="text-[9px] block">ডেলিভারিকৃত</span>
                        <strong>{completed} PCS</strong>
                      </div>
                      <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-700 dark:text-rose-300">
                        <span className="text-[9px] block">ড্যামেজ</span>
                        <strong>{damaged} PCS</strong>
                      </div>
                    </div>

                    {/* Supervisor Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleOpenNewTask(member.id)}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>কাজ বরাদ্দ</span>
                      </button>

                      {activeTask && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDeliveryModal(activeTask)}
                            className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] cursor-pointer"
                          >
                            জমা
                          </button>
                          <button
                            onClick={() => handleOpenDamageModal(activeTask)}
                            className="px-2 py-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] cursor-pointer"
                          >
                            ড্যামেজ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supervisor Sample Batch Quality Control Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>সুপারভাইজার স্যাম্পল টেস্ট & ট্রায়াল রান লগ (Sample & QC Control)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn'
                    ? 'নতুন লটের ৫জি/৪জি বোর্ড প্রসেসিং করার পূর্বে স্যাম্পল টেস্ট রান এবং পাসের রেকর্ড'
                    : 'Log trial runs and sample testing before full batch release'}
                </p>
              </div>

              <button
                onClick={handleOpenSampleModal}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন স্যাম্পল এন্ট্রি</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="p-3">স্যাম্পল / লটের নাম</th>
                    <th className="p-3 text-center">টেস্টেড পিস (Qty)</th>
                    <th className="p-3 text-center text-emerald-600">পাশ পিস (Pass)</th>
                    <th className="p-3 text-center text-rose-600">ফেইল পিস (Fail)</th>
                    <th className="p-3 text-center">QC স্ট্যাটাস</th>
                    <th className="p-3">নোট</th>
                    <th className="p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {supervisorSamples.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        কোনো স্যাম্পল টেস্টের বিবরণ নেই।
                      </td>
                    </tr>
                  ) : (
                    supervisorSamples.map((smp) => (
                      <tr key={smp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono">{formatDate(smp.date, lang)}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{smp.sampleName}</td>
                        <td className="p-3 text-center font-mono font-bold">{smp.testedQty} PCS</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{smp.passedQty} PCS</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-600">{smp.failedQty} PCS</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              smp.status === 'passed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : smp.status === 'conditional'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {smp.status === 'passed' ? 'PASSED' : smp.status === 'conditional' ? 'CONDITIONAL' : 'FAILED'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{smp.notes || '-'}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteSample(smp.id)}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )}

      {/* MODAL 1: Assign New Batch / Product Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>নতুন মাল প্রদান ও টাস্ক বরাদ্দ</span>
              </h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTask} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  কারিগর নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formWorkerId}
                  onChange={(e) => setFormWorkerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  required
                >
                  {processingStaff.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ব্যাচ নম্বর</label>
                  <input
                    type="text"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বোর্ড বা আইটেমের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formProductName}
                  onChange={(e) => setFormProductName(e.target.value)}
                  placeholder={lang === 'bn' ? "যেমন: মাদারবোর্ড আইসি সেপারেশন" : "e.g. Motherboard IC Separation"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    মাল দেওয়া (Given PCS) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formGivenPcs}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormGivenPcs(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    কাজের স্টার্ট টাইম
                  </label>
                  <input
                    type="text"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    placeholder="09:30 AM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* কোন প্রোডাক্ট থেকে কী কী প্রোডাক্ট বের হবে (Extracted Output Products) */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/70 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                      {lang === 'bn' ? 'কী কী আইটেম ও কত পিস বের হবে (আউটপুট প্রসেসিং)' : 'Extracted Output Products & PCS'}
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'bn' ? 'মাদারবোর্ড/কাঁচামাল ভেঙে কোন কোন পার্টস বের হচ্ছে' : 'Items yield produced from this raw board'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFormExtractedItem()}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === 'bn' ? '+ আইটেম যোগ করুন' : '+ Add Item'}</span>
                  </button>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex flex-wrap gap-1">
                  {['CPU IC', 'eMMC Memory IC', 'ক্যামেরা মডিউল', 'পাওয়ার আইসি (PMIC)', 'নেটওয়ার্ক আইসি (WTR)', 'তামার স্ক্র্যাপ'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddFormExtractedItem(preset, 0, preset.includes('তামা') ? 'kg' : 'pcs')}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {formExtractedItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formExtractedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateFormExtractedItem(item.id, 'name', e.target.value)}
                          placeholder={lang === 'bn' ? 'বের হওয়া আইটেমের নাম' : 'Extracted Item Name'}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                        <input
                          type="number"
                          min="0"
                          value={item.quantity || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateFormExtractedItem(item.id, 'quantity', e.target.value)}
                          placeholder="Pcs"
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-slate-900 dark:text-white text-center"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateFormExtractedItem(item.id, 'unit', e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="gm">gm</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormExtractedItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sampleCheck"
                  checked={formIsSample}
                  onChange={(e) => setFormIsSample(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="sampleCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  এটি একটি স্যাম্পল / ট্রায়াল রান (Sample Batch Test)
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বিশেষ নির্দেশনা / নোট
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="সাবধানে কাজ করার নির্দেশ বা কাজের টার্গেট..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>মাল বরাদ্দ নিশ্চিত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Delivery & Progress Update Modal */}
      {isDeliveryModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>কাজ ডেলিভারি & সময় আপডেট</span>
              </h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{selectedTask.workerName}</div>
              <div className="text-slate-500">{selectedTask.productName}</div>
              <div className="flex justify-between font-mono pt-1 text-[11px]">
                <span>মোট দেওয়া: <strong>{selectedTask.givenPcs} PCS</strong></span>
                <span className="text-rose-600">ড্যামেজ: <strong>{selectedTask.damagedPcs} PCS</strong></span>
              </div>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  মোট সম্পন্ন ও ডেলিভারিকৃত পিস (Delivered PCS)
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedTask.givenPcs - selectedTask.damagedPcs}
                  value={deliveredPcsInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDeliveredPcsInput(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  অবশিষ্ট থাকবে: <strong>{Math.max(0, selectedTask.givenPcs - deliveredPcsInput - selectedTask.damagedPcs)} PCS</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    সমাপ্তির সময় (End Time)
                  </label>
                  <input
                    type="text"
                    value={deliveryCompletionTime}
                    onChange={(e) => setDeliveryCompletionTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    কাজের ডিউরেশন (মিনিট)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryDurationMins}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDeliveryDurationMins(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* কোন প্রোডাক্ট থেকে কী কী প্রোডাক্ট ও কত পিস বের হলো (Extracted Output Products) */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/70 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                      {lang === 'bn' ? 'কী কী আইটেম ও কত পিস বের হয়েছে' : 'Extracted Yield Output & PCS'}
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {lang === 'bn' ? 'মাদারবোর্ড ভেঙে প্রস্তুতকৃত পার্টসের বিবরণ' : 'Specific parts extracted & yield counts'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddDeliveryExtractedItem()}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === 'bn' ? '+ আইটেম যোগ' : '+ Add Item'}</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1">
                  {['CPU IC', 'eMMC Memory IC', 'ক্যামেরা মডিউল', 'পাওয়ার আইসি (PMIC)', 'নেটওয়ার্ক আইসি (WTR)', 'তামার স্ক্র্যাপ'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddDeliveryExtractedItem(preset, deliveredPcsInput, preset.includes('তামা') ? 'kg' : 'pcs')}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                {deliveryExtractedItems.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {deliveryExtractedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateDeliveryExtractedItem(item.id, 'name', e.target.value)}
                          placeholder={lang === 'bn' ? 'বের হওয়া আইটেম' : 'Extracted Item'}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                        <input
                          type="number"
                          min="0"
                          value={item.quantity || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateDeliveryExtractedItem(item.id, 'quantity', e.target.value)}
                          placeholder="Pcs"
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs text-slate-900 dark:text-white text-center"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateDeliveryExtractedItem(item.id, 'unit', e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="gm">gm</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeliveryExtractedItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {lang === 'bn' ? 'উপরে বাটনে ক্লিক করে বের হওয়া আইটেম ও পিস যোগ করুন।' : 'Click above presets to add extracted items & quantities.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  কাজের স্ট্যাটাস
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as WorkerTaskStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="in_progress">চলমান (In Progress)</option>
                  <option value="completed">সম্পূর্ণ শেষ (Completed)</option>
                  <option value="on_hold">স্থগিত (On Hold)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নোট
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="কাজের মন্তব্য..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  আপডেট সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Damage Entry & Penalty Deduction Modal */}
      {isDamageModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>ড্যামেজ & পে-রোল জরিমানা কর্তন</span>
              </h3>
              <button onClick={() => setIsDamageModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{selectedTask.workerName}</div>
              <div className="text-slate-500">{selectedTask.productName}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                আগে ড্যামেজ ছিল: <strong>{selectedTask.damagedPcs} PCS</strong>
              </div>
            </div>

            <form onSubmit={handleSaveDamage} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নতুন নষ্ট / ড্যামেজ পিস (PCS) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedTask.givenPcs - selectedTask.completedPcs - selectedTask.damagedPcs}
                  value={damagePcsInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDamagePcsInput(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm text-rose-600 dark:text-rose-400"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ড্যামেজ বা নষ্ট হওয়ার কারণ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="বোর্ড ক্র্যাক ও ভুল ডিসোল্ডারিং">বোর্ড ক্র্যাক ও ভুল ডিসোল্ডারিং</option>
                  <option value="অতিরিক্ত হিট লেগে আইসি বার্ন">অতিরিক্ত হিট লেগে আইসি বার্ন</option>
                  <option value="হাতে চাপ লেগে পার্টস ভেঙে যাওয়া">হাতে চাপ লেগে পার্টস ভেঙে যাওয়া</option>
                  <option value="ভুল সর্টিং ও মিসিং পিস">ভুল সর্টিং ও মিসিং পিস</option>
                  <option value="অন্যান্য কারণ">অন্যান্য কারণ</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বেতন কর্তন / জরিমানা পরিমাণ (৳) [অটো পে-রোল এডজাস্ট]
                </label>
                <input
                  type="number"
                  min="0"
                  value={damagePenalty}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDamagePenalty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 font-mono font-bold text-purple-700 dark:text-purple-300"
                />
                <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                  * এই টাকাটি এইচআর পে-রোল মডিউলে কারিগরের বেতনের সময় স্বয়ংক্রিয়ভাবে কর্তন হবে।
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বিস্তারিত কারণ বা মন্তব্য
                </label>
                <textarea
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  rows={2}
                  placeholder="কী কারণে মাল নষ্ট হলো..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDamageModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  ড্যামেজ ও জরিমানা এন্ট্রি
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Supervisor Sample QC Modal */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>স্যাম্পল টেস্ট & কুয়ালিটি কন্ট্রোল এন্ট্রি</span>
              </h3>
              <button onClick={() => setIsSampleModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSampleRecord} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  স্যাম্পল টেস্ট এর বিবরণ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder={lang === 'bn' ? "যেমন: ৫জি ১০ পিস স্যাম্পল টেস্ট" : "e.g. 5G 10 pcs sample test"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">মোট টেস্ট</label>
                  <input
                    type="number"
                    min="1"
                    value={sampleTestedQty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSampleTestedQty(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">পাশ পিস</label>
                  <input
                    type="number"
                    min="0"
                    value={samplePassedQty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSamplePassedQty(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-rose-600 dark:text-rose-400 mb-1">ফেইল পিস</label>
                  <input
                    type="number"
                    min="0"
                    value={sampleFailedQty}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSampleFailedQty(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 font-mono font-bold text-rose-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">QC রেজাল্ট স্ট্যাটাস</label>
                <select
                  value={sampleStatus}
                  onChange={(e) => setSampleStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="passed">PASSED (ফুল লট অনুমোদিত)</option>
                  <option value="conditional">CONDITIONAL (শর্তসাপেক্ষে অনুমোদিত)</option>
                  <option value="failed">FAILED (লট রিজেক্ট)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">সুপারভাইজার মন্তব্য</label>
                <textarea
                  value={sampleNotes}
                  onChange={(e) => setSampleNotes(e.target.value)}
                  rows={2}
                  placeholder="টেস্ট রেজাল্ট সম্পর্কিত মতামত..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer"
                >
                  স্যাম্পল টেস্ট সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Product Conversion & Output Tracking Modal */}
      {isConversionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {editingConversion
                      ? (lang === 'bn' ? 'পণ্য রূপান্তর রেকর্ড এডিট' : 'Edit Product Conversion')
                      : (lang === 'bn' ? 'নতুন পণ্য রূপান্তর ও আউটপুট এন্ট্রি' : 'New Product Output Conversion')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'bn'
                      ? 'কাঁচামাল বা মাদারবোর্ড থেকে নতুন পণ্য উৎপাদন ও এক্সট্রাকশন রেকর্ড'
                      : 'Record yields extracted from input boards into new output products'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsConversionModalOpen(false);
                  setEditingConversion(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConversionForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={convDate}
                    onChange={(e) => setConvDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'কারিগর নির্বাচন করুন' : 'Select Worker'}
                  </label>
                  <select
                    value={convWorkerId}
                    onChange={(e) => setConvWorkerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold cursor-pointer"
                    required
                  >
                    <option value="">{lang === 'bn' ? '-- কারিগর বাছুন --' : '-- Select Worker --'}</option>
                    {processingStaff.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input Product Section */}
              <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                  {lang === 'bn' ? '১. মূল ইনপুট পণ্য (কাঁচামাল/বোর্ড)' : '1. Input Material / Board'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={convInputProduct}
                      onChange={(e) => setConvInputProduct(e.target.value)}
                      placeholder={lang === 'bn' ? 'ইনপুট পণ্য (যেমন: 64GB Board / Circuit)' : 'Input item name'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                      required
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={convInputQty}
                      onChange={(e) => setConvInputQty(parseFloat(e.target.value) || 0)}
                      placeholder="পরিমাণ"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      required
                    />
                    <select
                      value={convInputUnit}
                      onChange={(e) => setConvInputUnit(e.target.value as 'pcs' | 'kg')}
                      className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="kg">KG</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Output Product Section */}
              <div className="p-3.5 bg-cyan-50/60 dark:bg-cyan-950/20 rounded-2xl border border-cyan-200/60 dark:border-cyan-900/40 space-y-2">
                <span className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 uppercase block">
                  {lang === 'bn' ? '২. নতুন উৎপাদিত আউটপুট পণ্য' : '2. Yielded Output Product'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={convOutputProduct}
                      onChange={(e) => setConvOutputProduct(e.target.value)}
                      placeholder={lang === 'bn' ? 'আউটপুট পণ্য (যেমন: 32GB Board / Circuit)' : 'Output item name'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-cyan-950 dark:text-cyan-200"
                      required
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={convOutputQty}
                      onChange={(e) => setConvOutputQty(parseFloat(e.target.value) || 0)}
                      placeholder="পরিমাণ"
                      className="w-full px-2.5 py-2 rounded-xl border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-slate-800 font-mono font-black text-cyan-700 dark:text-cyan-300"
                      required
                    />
                    <select
                      value={convOutputUnit}
                      onChange={(e) => setConvOutputUnit(e.target.value as 'pcs' | 'kg')}
                      className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="kg">KG</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'এক্সট্রাক্ট পার্টস/উপাদান সামারি' : 'Extracted Components'}
                  </label>
                  <input
                    type="text"
                    value={convExtractedSummary}
                    onChange={(e) => setConvExtractedSummary(e.target.value)}
                    placeholder={lang === 'bn' ? 'যেমন: 2x 32GB ICs, 1x eMMC' : 'e.g. 2x ICs, Subparts'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-600 dark:text-rose-400 mb-1">
                    {lang === 'bn' ? 'অপচয় / লস পরিমাণ (Wastage)' : 'Wastage / Loss'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={convWastageOrLoss}
                    onChange={(e) => setConvWastageOrLoss(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 font-mono font-bold text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'মন্তব্য বা লট নোট' : 'Remarks / Notes'}
                </label>
                <textarea
                  value={convNotes}
                  onChange={(e) => setConvNotes(e.target.value)}
                  rows={2}
                  placeholder={lang === 'bn' ? 'রূপান্তর সংক্রান্ত কোনো বিশেষ নোট বা পর্যবেক্ষণ...' : 'Any details about this conversion batch...'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsConversionModalOpen(false);
                    setEditingConversion(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'কনভার্শন সংরক্ষণ করুন' : 'Save Conversion'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Unlimited Dynamic Worker Registration Modal */}
      {isNewWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {lang === 'bn' ? 'নতুন কারিগর দ্রুত নিবন্ধন (Unlimited Workers)' : 'Add New Processing Worker'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'bn' ? 'যেকোনো দিন তাৎক্ষণিকভাবে আনলিমিটেড কারিগর যোগ করুন' : 'No caps or limits on total workers'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewWorkerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewWorker} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'কারিগরের পূর্ণ নাম' : 'Worker Name'} *
                </label>
                <input
                  type="text"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: মো: রফিক উদ্দিন' : 'e.g. Rafiq Uddin'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'bn' ? 'পদবী / কাজের ধরণ' : 'Designation'}
                </label>
                <input
                  type="text"
                  value={newWorkerDesignation}
                  onChange={(e) => setNewWorkerDesignation(e.target.value)}
                  placeholder="প্রসেসিং কারিগর / সার্কিট এক্সপার্ট"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'দৈনিক হাজিরা রেট (৳)' : 'Daily Rate (৳)'}
                  </label>
                  <input
                    type="number"
                    value={newWorkerDailyRate}
                    onChange={(e) => setNewWorkerDailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'bn' ? 'মাসিক মূল বেতন (৳)' : 'Monthly Salary (৳)'}
                  </label>
                  <input
                    type="number"
                    value={newWorkerMonthlySalary}
                    onChange={(e) => setNewWorkerMonthlySalary(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewWorkerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'কারিগর সংরক্ষণ' : 'Add Worker'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
