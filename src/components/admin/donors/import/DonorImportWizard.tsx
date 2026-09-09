import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  Check,
  HelpCircle,
  Copy,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  ROKTOBONDON_IMPORT_FIELDS,
  suggestColumnMappings,
  parseImportFile,
  validateAndClassifyRows,
  generateDonorImportTemplateExcel,
  generateDonorImportTemplateCsv,
  generateErrorReportCsv,
  executeDonorImport,
} from '../../../../services/donorImportService';
import type { Donor } from '../../../../types';
import type {
  DonorImportMapping,
  DonorImportRowValidation,
  DonorImportExecutionResult,
} from '../../../../types/donorImport';
import { useAuth } from '../../../../contexts/AuthContext';
import { useData } from '../../../../contexts/DataContext';

interface DonorImportWizardProps {
  onImportComplete: () => void;
  onCancel: () => void;
}

export const DonorImportWizard: React.FC<DonorImportWizardProps> = ({
  onImportComplete,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const { donors, addAuditLog } = useData();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: File state
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Step 2: Mapping state
  const [mappings, setMappings] = useState<DonorImportMapping>({});

  // Step 3: Validation state
  const [validationResults, setValidationResults] = useState<DonorImportRowValidation[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'duplicate' | 'error'>('all');

  // Step 4: Duplicate choices & Execution
  const [importChoice, setImportChoice] = useState<'new_only' | 'new_and_selected'>('new_only');
  const [selectedDuplicateIndices, setSelectedDuplicateIndices] = useState<Set<number>>(new Set());
  const [executionResult, setExecutionResult] = useState<DonorImportExecutionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // STEP 1 HANDLERS: File Upload & Parse
  // ==========================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const parsed = await parseImportFile(selectedFile);
      setFile(selectedFile);
      setSheets(parsed.sheets);
      setSelectedSheet(parsed.selectedSheet);
      setRawRows(parsed.rows);
      setHeaders(parsed.headers);

      // Auto-suggest mappings
      const suggested = suggestColumnMappings(parsed.headers);
      setMappings(suggested);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(err.message || 'ফাইলটি পড়তে ব্যর্থ হয়েছে। সঠিক Excel (.xlsx) বা CSV ফাইল নির্বাচন করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplateExcel = () => {
    const blob = generateDonorImportTemplateExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'donor-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplateCsv = () => {
    const blob = generateDonorImportTemplateCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'donor-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // STEP 2 HANDLERS: Mapping
  // ==========================================
  const handleMappingChange = (header: string, targetField: string) => {
    setMappings((prev) => {
      const updated = { ...prev };
      if (!targetField || targetField === 'skip') {
        delete updated[header];
      } else {
        // Remove existing target field mapping if mapped elsewhere
        for (const k of Object.keys(updated)) {
          if (updated[k] === targetField) {
            delete updated[k];
          }
        }
        updated[header] = targetField;
      }
      return updated;
    });
  };

  const handleValidateAndProceedToPreview = () => {
    // Check required fields
    const mappedValues = Object.values(mappings);
    if (!mappedValues.includes('fullName')) {
      setErrorMsg('আবশ্যকীয় ফিল্ড "রক্তদাতার নাম (fullName)" ম্যাপিং করা আবশ্যক।');
      return;
    }
    if (!mappedValues.includes('phone')) {
      setErrorMsg('আবশ্যকীয় ফিল্ড "মোবাইল নম্বর (phone)" ম্যাপিং করা আবশ্যক।');
      return;
    }
    if (!mappedValues.includes('bloodGroup')) {
      setErrorMsg('আবশ্যকীয় ফিল্ড "রক্তের গ্রুপ (bloodGroup)" ম্যাপিং করা আবশ্যক।');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const results = validateAndClassifyRows(rawRows, mappings, donors);
      setValidationResults(results);
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'তথ্য যাচাইকরণে ত্রুটি দেখা দিয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // STEP 4 HANDLERS: Execution
  // ==========================================
  const handleExecuteImport = async () => {
    if (!file || !currentUser) return;
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // Filter out rows to import
      const validRowsToImport: any[] = [];
      const skippedDetails: Array<{ rowNumber: number; name?: string; phone?: string; status: string; reason: string }> = [];

      for (const res of validationResults) {
        if (res.status === 'ERROR') {
          skippedDetails.push({
            rowNumber: res.rowNumber,
            name: res.rawData[Object.keys(mappings).find((k) => mappings[k] === 'fullName') || ''],
            phone: res.rawData[Object.keys(mappings).find((k) => mappings[k] === 'phone') || ''],
            status: 'ERROR',
            reason: res.errors.join(', '),
          });
        } else if (res.status === 'DUPLICATE') {
          if (importChoice === 'new_and_selected' && selectedDuplicateIndices.has(res.rowNumber) && res.normalizedData) {
            validRowsToImport.push(res.normalizedData);
          } else {
            skippedDetails.push({
              rowNumber: res.rowNumber,
              name: res.normalizedData?.fullName || '',
              phone: res.normalizedData?.phone || '',
              status: 'DUPLICATE',
              reason: res.matchReason || 'ডুপ্লিকেট মোবাইল নম্বর',
            });
          }
        } else if (res.normalizedData) {
          validRowsToImport.push(res.normalizedData);
        }
      }

      if (validRowsToImport.length === 0) {
        throw new Error('আমদানি করার মতো কোনো বৈধ নতুন রক্তদাতার তথ্য পাওয়া যায়নি।');
      }

      const result = await executeDonorImport(file.name, validRowsToImport, skippedDetails, {
        id: currentUser.id,
        fullName: currentUser.fullName,
        role: currentUser.role,
      });

      setExecutionResult(result);
      addAuditLog(
        `রক্তদাতা তথ্য আমদানি: ${file.name}`,
        'DonorImportBatch',
        result.batchId,
        {
          imported: result.importedCount,
          skipped: result.skippedCount,
          errors: result.errorCount,
        }
      );
      setCurrentStep(5);
    } catch (err: any) {
      console.error('Import execution error:', err);
      setErrorMsg(err.message || 'আমদানি সম্পন্ন করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!executionResult) return;
    const blob = generateErrorReportCsv(executionResult.errors);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donor-import-errors-${file?.name || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculations for Step 3 stats
  const totalRowsCount = validationResults.length;
  const validCount = validationResults.filter((r) => r.status === 'VALID').length;
  const warningCount = validationResults.filter((r) => r.status === 'WARNING').length;
  const duplicateCount = validationResults.filter((r) => r.status === 'DUPLICATE').length;
  const errorCount = validationResults.filter((r) => r.status === 'ERROR').length;

  const filteredValidationResults = validationResults.filter((r) => {
    if (previewFilter === 'all') return true;
    if (previewFilter === 'valid') return r.status === 'VALID';
    if (previewFilter === 'warning') return r.status === 'WARNING';
    if (previewFilter === 'duplicate') return r.status === 'DUPLICATE';
    if (previewFilter === 'error') return r.status === 'ERROR';
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-red-600" />
            কাগজ / এক্সেল তালিকা থেকে রক্তদাতা আমদানি (Donor Import Wizard)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            পূর্বের কাগজের রেকর্ড ও স্প্রেডশীট থেকে নির্ভুলভাবে ডোনার প্রোফাইল যুক্ত করুন
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold">
          {[
            { step: 1, label: 'ফাইল' },
            { step: 2, label: 'ম্যাপিং' },
            { step: 3, label: 'যাচাই' },
            { step: 4, label: 'আমদানি' },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                currentStep === s.step
                  ? 'bg-red-50 text-red-700 border-red-200 shadow-2xs'
                  : currentStep > s.step
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono bg-white shadow-2xs">
                {currentStep > s.step ? '✓' : s.step}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 1: FILE UPLOAD & TEMPLATE             */}
      {/* ========================================== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Template Download Section */}
          <div className="p-5 bg-gradient-to-br from-slate-50 to-red-50/20 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-red-600" />
                স্ট্যান্ডার্ড নমুনা ফাইল (Sample Templates)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ভুল এড়াতে প্রস্তুতকৃত এক্সেল অথবা সিএসভি টেমপ্লেট ডাউনলোড করে তথ্য সাজিয়ে নিন
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-red-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Excel (.xlsx) টেমপ্লেট
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-red-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                CSV (.csv) টেমপ্লেট
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-red-400 bg-slate-50/50 hover:bg-red-50/20 rounded-2xl p-10 text-center cursor-pointer transition-all space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                এক্সেল (.xlsx) অথবা সিএসভি (.csv) ফাইল নির্বাচন করুন
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                কম্পিউটার বা ডিভাইস থেকে ফাইলটি এখানে ড্র্যাগ করে ছাড়ুন অথবা ক্লিক করুন
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-white rounded-full text-[11px] font-bold text-slate-600 border border-slate-200 shadow-2xs">
                সর্বোচ্চ ফাইল সাইজ: 10 MB (বাংলা ও ইংরেজি উভয় ডাটা সমর্থিত)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 2: COLUMN MAPPING                     */}
      {/* ========================================== */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500">নির্বাচিত ফাইল</p>
              <p className="text-sm font-bold text-slate-900">{file?.name} ({rawRows.length} সারি)</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              অন্য ফাইল নির্বাচন করুন
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">কলাম ম্যাপিং (Column Mapping)</h3>
            <p className="text-xs text-slate-500">
              ফাইলের কলামগুলোর সাথে রক্তবন্ধন সিস্টেমের ফিল্ড মিলিয়ে দিন
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {headers.map((header) => {
              const mappedKey = mappings[header] || 'skip';
              const targetMeta = ROKTOBONDON_IMPORT_FIELDS.find((f) => f.key === mappedKey);

              return (
                <div key={header} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div className="sm:w-1/3">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      {header}
                    </span>
                    {rawRows[0]?.[header] && (
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        নমুনা: {String(rawRows[0][header])}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:w-2/3">
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                    <select
                      value={mappedKey}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="skip">— বাদ দিন (Skip this column) —</option>
                      {ROKTOBONDON_IMPORT_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} {f.required ? '*(আবশ্যক)' : ''}
                        </option>
                      ))}
                    </select>

                    {targetMeta?.required && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0">
                        আবশ্যক
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              পেছনে
            </button>
            <button
              type="button"
              onClick={handleValidateAndProceedToPreview}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              যাচাই ও প্রিভিউ দেখুন
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 3: PREVIEW & VALIDATION RESULTS       */}
      {/* ========================================== */}
      {currentStep === 3 && (
        <div className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[11px] text-slate-500 font-medium">মোট সারি</p>
              <p className="text-lg font-black text-slate-900 font-mono">{totalRowsCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-[11px] text-emerald-700 font-medium">বৈধ (Valid)</p>
              <p className="text-lg font-black text-emerald-800 font-mono">{validCount}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[11px] text-amber-700 font-medium">সতর্কতা (Warning)</p>
              <p className="text-lg font-black text-amber-800 font-mono">{warningCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <p className="text-[11px] text-indigo-700 font-medium">ডুপ্লিকেট (Duplicate)</p>
              <p className="text-lg font-black text-indigo-800 font-mono">{duplicateCount}</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-[11px] text-red-700 font-medium">ত্রুটি (Error)</p>
              <p className="text-lg font-black text-red-800 font-mono">{errorCount}</p>
            </div>
          </div>

          {/* Filter subtabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { key: 'all', label: `সবগুলো (${totalRowsCount})` },
              { key: 'valid', label: `বৈধ (${validCount})` },
              { key: 'warning', label: `সতর্কতা (${warningCount})` },
              { key: 'duplicate', label: `ডুপ্লিকেট (${duplicateCount})` },
              { key: 'error', label: `ত্রুটিপূর্ণ (${errorCount})` },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setPreviewFilter(f.key as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  previewFilter === f.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table Preview */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-700">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">নাম</th>
                  <th className="p-3">মোবাইল</th>
                  <th className="p-3">গ্রুপ</th>
                  <th className="p-3">অবস্থা</th>
                  <th className="p-3">মন্তব্য / কারণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredValidationResults.slice(0, 50).map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={
                      row.status === 'ERROR'
                        ? 'bg-red-50/40'
                        : row.status === 'DUPLICATE'
                        ? 'bg-indigo-50/40'
                        : row.status === 'WARNING'
                        ? 'bg-amber-50/40'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="p-3 font-mono text-slate-400">{row.rowNumber}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {row.normalizedData?.fullName || row.rawData[Object.keys(mappings).find((k) => mappings[k] === 'fullName') || ''] || '—'}
                    </td>
                    <td className="p-3 font-mono">
                      {row.normalizedData?.phone || row.rawData[Object.keys(mappings).find((k) => mappings[k] === 'phone') || ''] || '—'}
                    </td>
                    <td className="p-3 font-bold">
                      {row.normalizedData?.bloodGroup ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-mono font-black">
                          {row.normalizedData.bloodGroup}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          row.status === 'VALID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.status === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : row.status === 'DUPLICATE'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {row.errors.length > 0
                        ? row.errors.join(', ')
                        : row.matchReason
                        ? row.matchReason
                        : row.warnings.length > 0
                        ? row.warnings.join(', ')
                        : 'সব তথ্য সঠিক'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Choice & Proceed */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs">ডুপ্লিকেট ও অসম্পূর্ণ তথ্য নিয়ন্ত্রণ</h4>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="importChoice"
                  value="new_only"
                  checked={importChoice === 'new_only'}
                  onChange={() => setImportChoice('new_only')}
                  className="text-red-600"
                />
                <span>
                  <strong>শুধুমাত্র নতুন ডোনার আমদানি করুন ({validCount + warningCount} টি)</strong> — ডুপ্লিকেট ({duplicateCount}) ও ত্রুটিপূর্ণ ({errorCount}) সারিগুলো এড়িয়ে যাওয়া হবে (প্রস্তাবিত)।
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              পেছনে
            </button>
            <button
              type="button"
              disabled={isLoading || (validCount + warningCount === 0)}
              onClick={handleExecuteImport}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  আমদানি প্রক্রিয়াধীন...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  চূড়ান্ত আমদানি সম্পন্ন করুন ({validCount + warningCount} জন)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 5: IMPORT COMPLETION SUMMARY          */}
      {/* ========================================== */}
      {currentStep === 5 && executionResult && (
        <div className="text-center py-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">রক্তদাতার তথ্য সফলভাবে আমদানি হয়েছে!</h3>
            <p className="text-xs text-slate-500 mt-1">
              আমদানিকৃত সকল ডোনার প্রোফাইল পেন্ডিং (Pending Verification) হিসেবে সংরক্ষিত হয়েছে
            </p>
          </div>

          <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium">আমদানি সম্পন্ন</p>
              <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
                {executionResult.importedCount}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <p className="text-xs text-indigo-700 font-medium">ডুপ্লিকেট বাদ</p>
              <p className="text-2xl font-black text-indigo-800 font-mono mt-1">
                {executionResult.duplicateCount}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-xs text-red-700 font-medium">ত্রুটিপূর্ণ বাদ</p>
              <p className="text-2xl font-black text-red-800 font-mono mt-1">
                {executionResult.errorCount}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
            {executionResult.errors.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadErrorReport}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-red-600" />
                বাদ পড়া তালিকার রিপোর্ট (Error Report CSV)
              </button>
            )}

            <button
              type="button"
              onClick={onImportComplete}
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              ডোনার তালিকায় ফিরে যান
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
