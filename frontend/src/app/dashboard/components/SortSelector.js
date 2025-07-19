import React from "react";

export default function SortSelector({ sortBy, setSortBy }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-slate-300">
        Sort by:
      </label>
      <select
        id="sort"
        value={sortBy}
        onChange={e => setSortBy(e.target.value)}
        className="bg-slate-800 text-white rounded px-2 py-1 text-sm"
      >
        <option value="recent">Most Recent</option>
        <option value="oldest">Oldest</option>
        <option value="size_desc">Size (Largest)</option>
        <option value="size_asc">Size (Smallest)</option>
        <option value="type">Type (Images First)</option>
      </select>
    </div>
  );
}