import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Role } from '../../types';
import { SearchCard } from '../organisms/SearchCard';
import { DataTable } from '../organisms/DataTable';
import { initialRoles } from '../../constants/mockData';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>(initialRoles);
  const [showSearch, setShowSearch] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSearch = (filters: any) => {
    const updated = roles.filter((role) => {
      // 1. Role name filter
      if (filters.name && !role.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      // 2. Role ID filter
      if (filters.id && !role.id.toLowerCase().includes(filters.id.toLowerCase())) {
        return false;
      }
      // 3. Status filter
      if (filters.status && !role.status.toLowerCase().includes(filters.status.toLowerCase())) {
        return false;
      }
      // 4. Remark filter
      if (filters.remark && !role.remark.toLowerCase().includes(filters.remark.toLowerCase())) {
        return false;
      }
      // 5. Start/End date simple search
      if (filters.startDate && !role.created.includes(filters.startDate)) {
        return false;
      }
      if (filters.endDate && !role.created.includes(filters.endDate)) {
        return false;
      }
      return true;
    });

    setFilteredRoles(updated);
  };

  const handleReset = () => {
    setFilteredRoles(roles);
  };

  const handleRolesChange = (updated: Role[]) => {
    setRoles(updated);
    setFilteredRoles(updated);
  };

  const content = (
    <div className={`space-y-4 flex flex-col h-full min-h-0 transition-all duration-200 ${
      isFullscreen ? 'fixed inset-0 z-[250] m-0 rounded-none p-6 bg-[var(--bg)]' : ''
    }`}>
      {/* Interactive Search Card */}
      {showSearch && <SearchCard onSearch={handleSearch} onReset={handleReset} />}

      {/* Stateful DataTable */}
      <div className="flex-1 min-h-0">
        <DataTable
          roles={filteredRoles}
          onRolesChange={handleRolesChange}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch(!showSearch)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />
      </div>
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
};
