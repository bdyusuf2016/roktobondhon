import React, { useState } from 'react';
import {
  Plus,
  MapPin,
  Building,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  ShieldCheck,
  Globe,
  Tag,
  X,
  Layers,
  Sparkles,
  PhoneCall,
  MessageSquare
} from 'lucide-react';
import { useData } from '../../../contexts/DataContext';
import { useOrgConfig } from '../../../contexts/OrgConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDialog } from '../../../contexts/DialogContext';
import { BaseModal } from '../../modals/BaseModal';
import type { Branch, LocationItem } from '../../../types';

export const AdminBranchesTab: React.FC = () => {
  const {
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    hasPermission,
  } = useData();
  const { config } = useOrgConfig();
  const { currentUser } = useAuth();
  const dialog = useDialog();

  const canManageBranches = hasPermission(currentUser?.role || 'admin', 'manage_branches');

  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'coverage'>('branches');

  // Branch management states
  const [branchSearch, setBranchSearch] = useState('');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('all');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Branch form state
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormNameBn, setBranchFormNameBn] = useState('');
  const [branchFormDistrict, setBranchFormDistrict] = useState('Dhaka');
  const [branchFormUpazila, setBranchFormUpazila] = useState('');
  const [branchFormCoordinator, setBranchFormCoordinator] = useState('');
  const [branchFormPhone, setBranchFormPhone] = useState('');
  const [branchFormIsActive, setBranchFormIsActive] = useState(true);

  // Coverage management states
  const [locationSearch, setLocationSearch] = useState('');
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocDistrict, setNewLocDistrict] = useState('Dhaka');
  const [newLocDivision, setNewLocDivision] = useState('Dhaka');
  const [newLocUpazila, setNewLocUpazila] = useState('');
  const [newLocUnions, setNewLocUnions] = useState('');

  // Union addition per upazila state
  const [editingUpazilaId, setEditingUpazilaId] = useState<string | null>(null);
  const [newUnionInput, setNewUnionInput] = useState('');

  // Calculate metrics
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b) => b.isActive).length;
  const totalUpazilas = locations.length;
  const totalUnions = locations.reduce((acc, loc) => acc + (loc.unions?.length || 0), 0);

  const openAddBranchModal = () => {
    setEditingBranch(null);
    setBranchFormName('');
    setBranchFormNameBn('');
    setBranchFormDistrict('Dhaka');
    setBranchFormUpazila('');
    setBranchFormCoordinator('');
    setBranchFormPhone('');
    setBranchFormIsActive(true);
    setShowBranchModal(true);
  };

  const openEditBranchModal = (b: Branch) => {
    setEditingBranch(b);
    setBranchFormName(b.name || '');
    setBranchFormNameBn(b.nameBn || '');
    setBranchFormDistrict(b.district || 'Dhaka');
    setBranchFormUpazila(b.upazila || '');
    setBranchFormCoordinator(b.coordinatorName || '');
    setBranchFormPhone(b.coordinatorPhone || '');
    setBranchFormIsActive(b.isActive);
    setShowBranchModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchFormNameBn.trim() || !branchFormUpazila.trim()) {
      dialog.alert({
        title: 'অসম্পূর্ণ তথ্য',
        message: 'অনুগ্রহ করে শাখার বাংলা নাম ও উপজেলা পূরণ করুন।',
        theme: 'warning',
      });
      return;
    }

    if (editingBranch) {
      await updateBranch(editingBranch.id, {
        name: branchFormName.trim() || branchFormNameBn.trim(),
        nameBn: branchFormNameBn.trim(),
        district: branchFormDistrict,
        upazila: branchFormUpazila.trim(),
        coordinatorName: branchFormCoordinator.trim() || 'শাখা সমন্বয়ক',
        coordinatorPhone: branchFormPhone.trim() || '+8801700000000',
        isActive: branchFormIsActive,
      });
      dialog.alert({
        title: 'শাখা হালনাগাদ সফল',
        message: `"${branchFormNameBn}" শাখার তথ্য সফলভাবে আপডেট করা হয়েছে।`,
        theme: 'success',
      });
    } else {
      await addBranch({
        organizationId: config.id,
        name: branchFormName.trim() || branchFormNameBn.trim(),
        nameBn: branchFormNameBn.trim(),
        district: branchFormDistrict,
        upazila: branchFormUpazila.trim(),
        coordinatorName: branchFormCoordinator.trim() || 'শাখা সমন্বয়ক',
        coordinatorPhone: branchFormPhone.trim() || '+8801700000000',
        isActive: branchFormIsActive,
      });
      dialog.alert({
        title: 'নতুন শাখা তৈরি হয়েছে',
        message: `"${branchFormNameBn}" শাখা সফলভাবে তৈরি করা হয়েছে।`,
        theme: 'success',
      });
    }

    setShowBranchModal(false);
  };

  const handleDeleteBranch = async (branch: Branch) => {
    const ok = await dialog.confirm({
      title: 'শাখা মুছে ফেলবেন?',
      message: `আপনি কি নিশ্চিতভাবে "${branch.nameBn}" শাখাটি অপসারণ করতে চান?`,
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      confirmTheme: 'danger',
    });
    if (ok) {
      await deleteBranch(branch.id);
      dialog.alert({
        title: 'অপসারিত হয়েছে',
        message: 'শাখাটি সফলভাবে অপসারণ করা হয়েছে।',
        theme: 'success',
      });
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    await updateBranch(branch.id, { isActive: !branch.isActive });
  };

  // Coverage / Location Handlers
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocUpazila.trim()) return;

    const parsedUnions = newLocUnions
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    await addLocation({
      division: newLocDivision,
      district: newLocDistrict,
      upazila: newLocUpazila.trim(),
      unions: parsedUnions.length > 0 ? parsedUnions : [`${newLocUpazila} Sadar`],
      isActive: true,
    });

    setShowAddLocationModal(false);
    setNewLocUpazila('');
    setNewLocUnions('');
    dialog.alert({
      title: 'নতুন উপজেলা যুক্ত হয়েছে',
      message: `"${newLocUpazila}" উপজেলা সফলভাবে কভারেজ তালিকায় যুক্ত হয়েছে।`,
      theme: 'success',
    });
  };

  const handleAddUnionToUpazila = async (location: LocationItem) => {
    if (!newUnionInput.trim()) return;
    const currentUnions = location.unions || [];
    if (currentUnions.includes(newUnionInput.trim())) {
      dialog.alert({
        title: 'ইউনিয়ন ইতিমধ্যে বিদ্যমান',
        message: 'এই ইউনিয়নটি ইতিমধ্যে এই উপজেলায় অন্তর্ভুক্ত রয়েছে।',
        theme: 'warning',
      });
      return;
    }

    const updatedUnions = [...currentUnions, newUnionInput.trim()];
    await updateLocation(location.id, { unions: updatedUnions });
    setNewUnionInput('');
  };

  const handleRemoveUnion = async (location: LocationItem, unionToRemove: string) => {
    const updatedUnions = (location.unions || []).filter((u) => u !== unionToRemove);
    await updateLocation(location.id, { unions: updatedUnions });
  };

  const handleToggleLocationStatus = async (location: LocationItem) => {
    await updateLocation(location.id, { isActive: !location.isActive });
  };

  const handleDeleteLocation = async (location: LocationItem) => {
    const ok = await dialog.confirm({
      title: 'কভারেজ উপজেলা মুছে ফেলবেন?',
      message: `"${location.upazila}" এবং এর অধীনস্থ সকল ইউনিয়ন মুছে ফেলতে চান?`,
      confirmText: 'হ্যাঁ, মুছুন',
      confirmTheme: 'danger',
    });
    if (ok) {
      await deleteLocation(location.id);
      dialog.alert({
        title: 'মুছে ফেলা হয়েছে',
        message: 'উপজেলা কভারেজ সফলভাবে অপসারণ করা হয়েছে।',
        theme: 'success',
      });
    }
  };

  const filteredBranches = branches.filter((b) => {
    if (selectedDistrictFilter !== 'all' && b.district !== selectedDistrictFilter) return false;
    if (branchSearch.trim()) {
      const q = branchSearch.toLowerCase();
      return (
        b.nameBn.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.upazila.toLowerCase().includes(q) ||
        b.coordinatorName.toLowerCase().includes(q) ||
        b.coordinatorPhone.includes(q)
      );
    }
    return true;
  });

  const filteredLocations = locations.filter((loc) => {
    if (locationSearch.trim()) {
      const q = locationSearch.toLowerCase();
      const matchUpazila = loc.upazila.toLowerCase().includes(q);
      const matchDistrict = loc.district.toLowerCase().includes(q);
      const matchUnion = loc.unions?.some((u) => u.toLowerCase().includes(q));
      return matchUpazila || matchDistrict || matchUnion;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">মোট শাখা / চ্যাপ্টার</span>
          <span className="text-2xl font-black text-slate-900 block mt-1 tracking-tight">{totalBranches}</span>
          <span className="text-[10px] text-slate-500">ধামরাই, সাভার ও মানিকগঞ্জ</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">সক্রিয় শাখা</span>
          <span className="text-2xl font-black text-emerald-600 block mt-1 tracking-tight">{activeBranches}</span>
          <span className="text-[10px] text-slate-500">ফিল্ডে কার্যকর শাখা</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">আওতাভুক্ত উপজেলা</span>
          <span className="text-2xl font-black text-blue-600 block mt-1 tracking-tight">{totalUpazilas}</span>
          <span className="text-[10px] text-slate-500">ভৌগোলিক কভারেজ জোন</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">কভারকৃত ইউনিয়ন</span>
          <span className="text-2xl font-black text-purple-600 block mt-1 tracking-tight">{totalUnions}</span>
          <span className="text-[10px] text-slate-500">তৃণমূল রক্তদাতা নেটওয়ার্ক</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('branches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'branches'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Building className="w-4 h-4" />
            শাখা ও চ্যাপ্টারসমূহ ({branches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('coverage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'coverage'
                ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <MapPin className="w-4 h-4" />
            কভারেজ জোন ও ইউনিয়ন নিয়ন্ত্রণ ({locations.length} উপজেলা)
          </button>
        </div>

        {/* TAB 1: Branches & Chapters */}
        {activeSubTab === 'branches' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  শাখা ও সমন্বয়ক ব্যবস্থাপনা
                </h2>
                <p className="text-xs text-slate-500">
                  প্রতিটি আঞ্চলিক শাখার দায়িত্বশীল সমন্বয়ক ও যোগাযোগ কন্ট্রোল
                </p>
              </div>
              {canManageBranches && (
                <button
                  type="button"
                  onClick={openAddBranchModal}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন শাখা যুক্ত করুন
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="শাখার নাম, সমন্বয়ক বা ফোন নম্বর দিয়ে অনুসন্ধান..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <select
                value={selectedDistrictFilter}
                onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 font-medium"
              >
                <option value="all">সকল জেলা</option>
                <option value="Dhaka">ঢাকা জেলা</option>
                <option value="Manikganj">মানিকগঞ্জ জেলা</option>
                <option value="Gazipur">গাজীপুর জেলা</option>
              </select>
            </div>

            {/* Branch Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredBranches.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition-all ${
                    b.isActive
                      ? 'border-slate-200 bg-white hover:border-red-200 hover:shadow-xs'
                      : 'border-slate-200 bg-slate-50/80 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 block">{b.id}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-0.5">{b.nameBn}</h3>
                      <p className="text-[11px] text-slate-500">{b.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleBranchStatus(b)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        b.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}
                      title="স্ট্যাটাস পরিবর্তন করুন"
                    >
                      {b.isActive ? '● সক্রিয়' : '○ নিষ্ক্রিয়'}
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.district} • {b.upazila}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{b.coordinatorName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <a
                        href={`tel:${b.coordinatorPhone}`}
                        className="flex items-center gap-1 font-mono font-bold text-red-700 hover:text-red-800 bg-red-50 px-2 py-1 rounded-md text-[11px] border border-red-100"
                      >
                        <PhoneCall className="w-3 h-3 text-red-600" />
                        {b.coordinatorPhone}
                      </a>
                      <a
                        href={`https://wa.me/${b.coordinatorPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md border border-emerald-200"
                        title="হোয়াটসঅ্যাপে মেসেজ পাঠান"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {canManageBranches && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditBranchModal(b)}
                        className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-medium border border-slate-200 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        এডিট
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBranch(b)}
                        className="px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium border border-slate-200 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        মুছুন
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Coverage Zones & Unions */}
        {activeSubTab === 'coverage' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  কভারেজ জোন ও তৃণমূল ইউনিয়নসমূহ
                </h2>
                <p className="text-xs text-slate-500">
                  রক্তদাতা রেজিস্ট্রেশন ও ব্লাড রিকোয়েস্টের জন্য কার্যকর ভৌগোলিক এলাকা
                </p>
              </div>
              {canManageBranches && (
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs border border-red-700/60 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  নতুন উপজেলা যুক্ত করুন
                </button>
              )}
            </div>

            {/* Location Search Bar */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="উপজেলা বা ইউনিয়নের নাম দিয়ে ফিল্টার করুন..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Locations Accordion / Card List */}
            <div className="space-y-3">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 font-bold flex items-center justify-center text-xs border border-red-100">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          {loc.upazila}
                          <span className="text-[11px] font-normal text-slate-500">
                            ({loc.district}, {loc.division})
                          </span>
                        </h3>
                        <span className="text-[11px] text-slate-500">
                          মোট কভারকৃত ইউনিয়ন: <strong className="text-slate-800 font-mono">{loc.unions?.length || 0}</strong> টি
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLocationStatus(loc)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          loc.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        }`}
                      >
                        {loc.isActive ? 'সক্রিয় কভারেজ' : 'স্থগিত'}
                      </button>

                      {canManageBranches && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          title="উপজেলা অপসারণ করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unions Pill Badges */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>আওতাভুক্ত ইউনিয়ন ও পৌরসভা:</span>
                      <button
                        type="button"
                        onClick={() => setEditingUpazilaId(editingUpazilaId === loc.id ? null : loc.id)}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {editingUpazilaId === loc.id ? 'সম্পাদনা বন্ধ করুন' : 'ইউনিয়ন যুক্ত করুন'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {loc.unions?.map((union) => (
                        <span
                          key={union}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-800 shadow-2xs font-medium"
                        >
                          <Tag className="w-3 h-3 text-slate-400" />
                          {union}
                          {canManageBranches && editingUpazilaId === loc.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveUnion(loc, union)}
                              className="ml-1 text-slate-400 hover:text-red-600"
                              title="মুছুন"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Inline add union form */}
                    {editingUpazilaId === loc.id && (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newUnionInput}
                          onChange={(e) => setNewUnionInput(e.target.value)}
                          placeholder="নতুন ইউনিয়নের নাম লিখুন..."
                          className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500 bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddUnionToUpazila(loc);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddUnionToUpazila(loc)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          যুক্ত করুন
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Branch Modal */}
      <BaseModal
        isOpen={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        theme="modern"
        size="md"
        icon={<Building className="w-5 h-5 text-red-600" />}
        title={editingBranch ? 'শাখার তথ্য সম্পাদনা' : 'নতুন শাখা / চ্যাপ্টার তৈরি করুন'}
        subtitle="আঞ্চলিক রক্তদাতা সমন্বয় টিম গঠন ও নিয়ন্ত্রণ।"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowBranchModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSaveBranch}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors border border-red-700/60 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {editingBranch ? 'আপডেট সংরক্ষণ করুন' : 'শাখা তৈরি করুন'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              শাখার নাম (বাংলায়) *
            </label>
            <input
              type="text"
              required
              value={branchFormNameBn}
              onChange={(e) => setBranchFormNameBn(e.target.value)}
              placeholder="যেমন: সাটুরিয়া উপজেলা শাখা"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              শাখার নাম (English)
            </label>
            <input
              type="text"
              value={branchFormName}
              onChange={(e) => setBranchFormName(e.target.value)}
              placeholder="e.g. Saturia Chapter"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                জেলা *
              </label>
              <select
                value={branchFormDistrict}
                onChange={(e) => setBranchFormDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                <option value="Dhaka">ঢাকা (Dhaka)</option>
                <option value="Manikganj">মানিকগঞ্জ (Manikganj)</option>
                <option value="Gazipur">গাজীপুর (Gazipur)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                উপজেলা *
              </label>
              <input
                type="text"
                required
                value={branchFormUpazila}
                onChange={(e) => setBranchFormUpazila(e.target.value)}
                placeholder="যেমন: Saturia"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              সমন্বয়কের নাম *
            </label>
            <input
              type="text"
              required
              value={branchFormCoordinator}
              onChange={(e) => setBranchFormCoordinator(e.target.value)}
              placeholder="সমন্বয়কের পুরো নাম"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              মোবাইল নম্বর (হটলাইন / কল) *
            </label>
            <input
              type="tel"
              required
              value={branchFormPhone}
              onChange={(e) => setBranchFormPhone(e.target.value)}
              placeholder="+88017..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500 font-mono"
            />
          </div>

          <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={branchFormIsActive}
              onChange={(e) => setBranchFormIsActive(e.target.checked)}
              className="rounded-sm text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <span className="font-semibold text-slate-800">শাখা সক্রিয় রাখুন</span>
          </label>
        </form>
      </BaseModal>

      {/* Add Location Modal */}
      <BaseModal
        isOpen={showAddLocationModal}
        onClose={() => setShowAddLocationModal(false)}
        theme="modern"
        size="md"
        icon={<MapPin className="w-5 h-5 text-red-600" />}
        title="নতুন উপজেলা কভারেজ জোন"
        subtitle="প্ল্যাটফর্মে নতুন উপজেলা ও আওতাভুক্ত ইউনিয়নসমূহ যুক্ত করুন।"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowAddLocationModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleAddLocation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors border border-red-700/60"
            >
              কভারেজ যোগ করুন
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddLocation} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                বিভাগ *
              </label>
              <input
                type="text"
                required
                value={newLocDivision}
                onChange={(e) => setNewLocDivision(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                জেলা *
              </label>
              <select
                value={newLocDistrict}
                onChange={(e) => setNewLocDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                <option value="Dhaka">Dhaka</option>
                <option value="Manikganj">Manikganj</option>
                <option value="Gazipur">Gazipur</option>
                <option value="Tangail">Tangail</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              উপজেলার নাম *
            </label>
            <input
              type="text"
              required
              value={newLocUpazila}
              onChange={(e) => setNewLocUpazila(e.target.value)}
              placeholder="যেমন: সাটুরিয়া (Saturia)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ইউনিয়নসমূহের তালিকা (কমা দিয়ে পৃথক করুন)
            </label>
            <textarea
              rows={3}
              value={newLocUnions}
              onChange={(e) => setNewLocUnions(e.target.value)}
              placeholder="যেমন: Saturia Sadar, Baliati, Baraid, Dargagram, Dhanakora"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              প্রতিটি ইউনিয়নের নাম কমা (,) দিয়ে লিখুন। পরবর্তীতে প্রয়োজন অনুযায়ী নতুন ইউনিয়ন যোগ করা যাবে।
            </p>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};
