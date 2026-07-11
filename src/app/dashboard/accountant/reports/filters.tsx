// src/app/dashboard/accountant/reports/filters.tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(searchParams.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") ?? "");
  const [studentId, setStudentId] = useState(searchParams.get("studentId") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (studentId) params.set("studentId", studentId);
    if (status) params.set("status", status);
    // Replace the current URL while preserving the base path
    router.replace(`/dashboard/accountant/reports?${params.toString()}`);
  };

  return (
    <div className="filtersContainer">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="filterInput"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="filterInput"
      />
      <input
        type="text"
        placeholder="Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="filterInput"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="filterSelect"
      >
        <option value="">All Statuses</option>
        <option value="paid">Paid</option>
        <option value="unpaid">Unpaid</option>
        <option value="overdue">Overdue</option>
      </select>
      <button type="button" onClick={applyFilters} className="applyButton">
        Apply
      </button>
    </div>
  );
}
