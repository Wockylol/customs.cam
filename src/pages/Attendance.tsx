import React, { useState, useRef } from 'react';
import { Clock, Users, CheckCircle, AlertCircle, XCircle, Calendar, Filter, Grid, List, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import Layout from '../components/layout/Layout';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAttendance } from '../hooks/useAttendance';
import { useAuth } from '../contexts/AuthContext';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const EDT_TIMEZONE = 'America/New_York';

// Get current date in EDT timezone formatted as YYYY-MM-DD
const getCurrentDateInEDT = () => {
  const now = new Date();
  const edtDate = toZonedTime(now, EDT_TIMEZONE);
  return format(edtDate, 'yyyy-MM-dd');
};

const Attendance: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getCurrentDateInEDT());
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const edtDate = toZonedTime(new Date(), EDT_TIMEZONE);
    return format(edtDate, 'yyyy-MM');
  });
  const [attendanceData, setAttendanceData] = useState<Record<string, {
    status: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early' | null;
    selectedStatuses: Set<'late' | 'left_early'>;
    clockInTime: string;
    clockOutTime: string;
    notes: string;
  }>>({});

  const { teamMembers } = useTeamMembers();
  const { attendanceRecords, loading, error, markAttendance } = useAttendance(
    viewMode === 'daily' ? selectedDate : undefined, 
    viewMode === 'monthly' ? selectedMonth : undefined, 
    viewMode
  );
  const { teamMember } = useAuth();

  // Filter team members by role, shift, and search query
  const teamMembersForAttendance = teamMembers.filter(member => {
    const matchesRole = selectedRole === 'all' || 
      (selectedRole === 'chatter' && member.role === 'chatter') ||
      (selectedRole === 'manager' && member.role === 'manager') ||
      (selectedRole === 'staff' && (member.role === 'chatter' || member.role === 'manager'));
    const isActive = member.is_active;
    const matchesShift = selectedShift === 'all' || member.shift === selectedShift;
    const matchesSearch = searchQuery === '' || 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesRole && isActive && matchesShift && matchesSearch;
  });

  // Debug logging for team member filtering
  if (viewMode === 'monthly') {
    console.log(`👥 [TEAM FILTER] Total team members: ${teamMembers.length}`);
    console.log(`👥 [TEAM FILTER] Filtered team members: ${teamMembersForAttendance.length}`);
    console.log(`👥 [TEAM FILTER] Team member IDs with 2025-09-28 records:`, 
      attendanceRecords.filter(r => r.date === '2025-09-28').map(r => r.team_member_id)
    );
    console.log(`👥 [TEAM FILTER] Filtered team member IDs:`, teamMembersForAttendance.map(m => m.id));
  }

  // Get existing attendance for a team member
  const getExistingAttendance = (teamMemberId: string) => {
    return attendanceRecords.find(record => record.team_member_id === teamMemberId);
  };

  // Handle attendance status change
  const handleStatusChange = async (teamMemberId: string, status: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early') => {
    const existing = getExistingAttendance(teamMemberId);
    const currentData = attendanceData[teamMemberId];
    
    // Handle multi-select for late and left_early
    if (status === 'late' || status === 'left_early') {
      // Initialize selectedStatuses from existing record if no pending data
      let currentSelected = currentData?.selectedStatuses;
      if (!currentSelected && existing) {
        currentSelected = new Set<'late' | 'left_early'>();
        if (existing.status === 'late' || existing.status === 'late_and_left_early') currentSelected.add('late');
        if (existing.status === 'left_early' || existing.status === 'late_and_left_early') currentSelected.add('left_early');
      }
      currentSelected = currentSelected || new Set();
      
      const newSelected = new Set(currentSelected);
      
      if (newSelected.has(status)) {
        newSelected.delete(status);
      } else {
        newSelected.add(status);
      }
      
      // Update local state for multi-select
      setAttendanceData(prev => ({
        ...prev,
        [teamMemberId]: {
          ...prev[teamMemberId],
          selectedStatuses: newSelected,
          status: newSelected.size === 0 ? null : 
                 newSelected.size === 2 ? 'late_and_left_early' :
                 newSelected.has('late') ? 'late' : 'left_early',
          clockInTime: prev[teamMemberId]?.clockInTime !== undefined ? prev[teamMemberId].clockInTime : (existing?.clock_in_time || ''),
          clockOutTime: prev[teamMemberId]?.clockOutTime !== undefined ? prev[teamMemberId].clockOutTime : (existing?.clock_out_time || ''),
          notes: prev[teamMemberId]?.notes !== undefined ? prev[teamMemberId].notes : (existing?.notes || '')
        }
      }));
      
      // Don't auto-submit for multi-select statuses - wait for times to be entered
      return;
    }
    
    // For single-select statuses (on_time, no_show, day_off), submit immediately
    console.log('🔄 Single status change requested:', { teamMemberId, status, existing: !!existing });
    
    const result = await markAttendance({
      teamMemberId,
      date: selectedDate,
      status,
      notes: status === 'no_show' || status === 'day_off' ? (existing?.notes || '') : undefined
    });
    
    if (result.error) {
      console.error('❌ Failed to update attendance:', result.error);
      return;
    }
    
    console.log('✅ Attendance updated successfully');
    
    // Clear pending form data for single-select statuses
    setAttendanceData(prev => {
      const newData = { ...prev };
      delete newData[teamMemberId];
      return newData;
    });
  };

  // Handle clock in time change
  const handleClockInTimeChange = async (teamMemberId: string, time: string) => {
    const existing = getExistingAttendance(teamMemberId);
    const currentData = attendanceData[teamMemberId];
    
    // Update local state first
    setAttendanceData(prev => ({
      ...prev,
      [teamMemberId]: {
        ...prev[teamMemberId],
        clockInTime: time
      }
    }));
    
    // Auto-submit if we have all required data
    const selectedStatuses = currentData?.selectedStatuses || new Set();
    const hasLeftEarly = selectedStatuses.has('left_early');
    const clockOutTime = currentData?.clockOutTime || '';
    
    if (selectedStatuses.has('late') && time) {
      if (hasLeftEarly && clockOutTime) {
        // Both late and left early with both times
        await markAttendance({
          teamMemberId,
          date: selectedDate,
          status: 'late_and_left_early',
          clockInTime: time,
          clockOutTime: clockOutTime
        });
        
        setAttendanceData(prev => {
          const newData = { ...prev };
          delete newData[teamMemberId];
          return newData;
        });
      } else if (!hasLeftEarly) {
        // Just late
        await markAttendance({
          teamMemberId,
          date: selectedDate,
          status: 'late',
          clockInTime: time
        });
        
        setAttendanceData(prev => {
          const newData = { ...prev };
          delete newData[teamMemberId];
          return newData;
        });
      }
    }
  };

  // Handle clock out time change
  const handleClockOutTimeChange = async (teamMemberId: string, time: string) => {
    const existing = getExistingAttendance(teamMemberId);
    const currentData = attendanceData[teamMemberId];
    
    // Update local state first
    setAttendanceData(prev => ({
      ...prev,
      [teamMemberId]: {
        ...prev[teamMemberId],
        clockOutTime: time
      }
    }));
    
    // Auto-submit if we have all required data
    const selectedStatuses = currentData?.selectedStatuses || new Set();
    const hasLate = selectedStatuses.has('late');
    const clockInTime = currentData?.clockInTime || '';
    
    if (selectedStatuses.has('left_early') && time) {
      if (hasLate && clockInTime) {
        // Both late and left early with both times
        await markAttendance({
          teamMemberId,
          date: selectedDate,
          status: 'late_and_left_early',
          clockInTime: clockInTime,
          clockOutTime: time
        });
        
        setAttendanceData(prev => {
          const newData = { ...prev };
          delete newData[teamMemberId];
          return newData;
        });
      } else if (!hasLate) {
        // Just left early
        await markAttendance({
          teamMemberId,
          date: selectedDate,
          status: 'left_early',
          clockOutTime: time
        });
        
        setAttendanceData(prev => {
          const newData = { ...prev };
          delete newData[teamMemberId];
          return newData;
        });
      }
    }
  };

  // Debounced notes saver for no_show/day_off
  const noteSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const handleNotesChange = async (teamMemberId: string, notes: string) => {
    const existing = getExistingAttendance(teamMemberId);
    const currentData = attendanceData[teamMemberId];
    const status = existing?.status || currentData?.status;

    if (noteSaveTimers.current[teamMemberId]) {
      clearTimeout(noteSaveTimers.current[teamMemberId]);
    }

    noteSaveTimers.current[teamMemberId] = setTimeout(async () => {
      const latestExisting = getExistingAttendance(teamMemberId);
      const latestData = attendanceData[teamMemberId];
      const latestStatus = latestExisting?.status || latestData?.status;
      const latestNotes = latestData?.notes ?? notes;

      if ((latestStatus === 'no_show' || latestStatus === 'day_off') && (latestNotes?.trim() || '') !== '') {
        await markAttendance({
          teamMemberId,
          date: selectedDate,
          status: latestStatus,
          notes: latestNotes
        });

        // Only clear pending for new entries; keep pending for existing to maintain smooth typing state
        if (!latestExisting) {
          setAttendanceData(prev => {
            const newData = { ...prev };
            delete newData[teamMemberId];
            return newData;
          });
        }
      }
    }, 600);
  };

  // Submit attendance for a team member
  const submitAttendance = async (teamMemberId: string) => {
    const data = attendanceData[teamMemberId];
    if (!data?.status) return;

    const { error } = await markAttendance({
      teamMemberId,
      date: selectedDate,
      status: data.status,
      clockInTime: data.status === 'late' ? data.clockInTime : undefined,
      notes: data.status === 'no_show' ? data.notes : undefined
    });

    if (!error) {
      // Clear local form data after successful submission
      setAttendanceData(prev => {
        const newData = { ...prev };
        delete newData[teamMemberId];
        return newData;
      });
    }
  };

  // Get current status for display
  const getCurrentStatus = (teamMemberId: string) => {
    const existing = getExistingAttendance(teamMemberId);
    const pending = attendanceData[teamMemberId];
    
    // Check if this is the dedicated combined status
    const isCombined = existing?.status === 'late_and_left_early';
    
    if (pending?.selectedStatuses || pending?.status || pending?.notes || pending?.clockInTime || pending?.clockOutTime) {
      return {
        status: pending.status || existing?.status || null,
        selectedStatuses: pending.selectedStatuses || new Set(),
        clockInTime: pending.clockInTime !== undefined ? pending.clockInTime : (existing?.clock_in_time || ''),
        clockOutTime: pending.clockOutTime !== undefined ? pending.clockOutTime : (existing?.clock_out_time || ''),
        notes: pending.notes !== undefined ? pending.notes : (existing?.notes || ''),
        isSubmitted: !!existing,
        isCombined
      };
    }
    
    if (existing) {
      // Reconstruct selected statuses from existing record
      const selectedStatuses = new Set<'late' | 'left_early'>();
      if (existing.status === 'late' || existing.status === 'late_and_left_early') selectedStatuses.add('late');
      if (existing.status === 'left_early' || existing.status === 'late_and_left_early') selectedStatuses.add('left_early');
      
      return {
        status: existing.status,
        selectedStatuses,
        clockInTime: existing.clock_in_time,
        clockOutTime: existing.clock_out_time,
        notes: existing.notes,
        isSubmitted: true,
        isCombined
      };
    }
    
    return null;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_time':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'late':
      case 'late_and_left_early':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'left_early':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'no_show':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'day_off':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'late':
      case 'late_and_left_early':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'left_early':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'no_show':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'day_off':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const shifts = [
    { value: 'all', label: 'All Shifts' },
    { value: '10-6', label: 'Day Shift (10am-6pm)' },
    { value: '6-2', label: 'Evening Shift (6pm-2am)' },
    { value: '2-10', label: 'Night Shift (2am-10am)' }
  ];

  // Helper functions for monthly view
  const getDaysInMonth = () => {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${selectedMonth}-${day.toString().padStart(2, '0')}`;
      return { day, date };
    });
  };

  const getAttendanceForDate = (teamMemberId: string, date: string) => {
    const record = attendanceRecords?.find(record => 
      record.team_member_id === teamMemberId && 
      record.date === date
    );
    
    if (date === '2025-09-28') {
      console.log(`🔍 [GET ATTENDANCE] Looking for ${date} for team member ${teamMemberId}`);
      console.log(`📋 [GET ATTENDANCE] Found record:`, record);
      console.log(`📊 [GET ATTENDANCE] Total records available:`, attendanceRecords?.length);
      console.log(`🎯 [GET ATTENDANCE] Records for this date:`, attendanceRecords?.filter(r => r.date === date));
    }
    
    return record;
  };

  const getAttendanceIcon = (status: string | null) => {
    switch (status) {
      case 'on_time':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'left_early':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'no_show':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'day_off':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      default:
        return <div className="w-4 h-4 bg-gray-200 rounded-full" />;
    }
  };

  if (loading) {
    return (
      <Layout title="Attendance">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading attendance...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Attendance">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading attendance: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Daily Attendance</h1>
              <p className="text-blue-100 text-sm lg:text-base">Track team member attendance by shift</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{teamMembersForAttendance.length}</div>
              <div className="text-blue-100 text-sm">Total Team Members</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {attendanceRecords.filter(r => {
                  const chatter = teamMembers.find(tm => tm.id === r.team_member_id);
                  return r.status === 'on_time' && (selectedShift === 'all' || chatter?.shift === selectedShift);
                }).length}
              </div>
              <div className="text-blue-100 text-sm">On Time</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {attendanceRecords.filter(r => {
                  const teamMember = teamMembers.find(tm => tm.id === r.team_member_id);
                  return (r.status === 'late' || r.status === 'late_and_left_early') && (selectedShift === 'all' || teamMember?.shift === selectedShift);
                }).length}
              </div>
              <div className="text-blue-100 text-sm">Late Arrivals</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {attendanceRecords.filter(r => {
                  const teamMember = teamMembers.find(tm => tm.id === r.team_member_id);
                  return r.status === 'day_off' && (selectedShift === 'all' || teamMember?.shift === selectedShift);
                }).length}
              </div>
              <div className="text-blue-100 text-sm">Days Off</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {attendanceRecords.filter(r => {
                  const teamMember = teamMembers.find(tm => tm.id === r.team_member_id);
                  return r.status === 'no_show' && (selectedShift === 'all' || teamMember?.shift === selectedShift);
                }).length}
              </div>
              <div className="text-blue-100 text-sm">No Shows</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {Math.round((attendanceRecords.filter(r => {
                  const teamMember = teamMembers.find(tm => tm.id === r.team_member_id);
                  return r.status === 'on_time' && (selectedShift === 'all' || teamMember?.shift === selectedShift);
                }).length / Math.max(1, teamMembersForAttendance.length)) * 100)}%
              </div>
              <div className="text-blue-100 text-sm">On Time Rate</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            
            {/* View Mode Toggle */}
            <div className="ml-auto flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                Daily
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4 mr-2" />
                Monthly
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search team members by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Date/Month Filter and Shift Filter */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {viewMode === 'daily' ? (
                <div className="w-full sm:w-48">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="w-full sm:w-48">
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <input
                    type="month"
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Shift Filter Bubbles */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift Filter
                </label>
                <div className="flex flex-wrap gap-2">
                  {shifts.map((shift) => (
                    <button
                      key={shift.value}
                      onClick={() => setSelectedShift(shift.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedShift === shift.value
                          ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                      }`}
                    >
                      {shift.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Role Filter */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Filter
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Roles', description: 'Show all team members' },
                    { value: 'chatter', label: 'Chatters', description: 'Operational staff' },
                    { value: 'manager', label: 'Managers', description: 'Management team' },
                    { value: 'staff', label: 'All Staff', description: 'Chatters + Managers' }
                  ].map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedRole === role.value
                          ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                      }`}
                      title={role.description}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Content */}
        {viewMode === 'daily' ? (
          /* Daily View */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Attendance for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
            </div>

            {teamMembersForAttendance.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No team members found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery 
                    ? `No team members found matching "${searchQuery}".`
                    : selectedRole !== 'all' && selectedShift !== 'all'
                      ? `No ${selectedRole === 'staff' ? 'staff members' : selectedRole + 's'} assigned to the ${shifts.find(s => s.value === selectedShift)?.label.toLowerCase()}.`
                      : selectedRole !== 'all'
                        ? `No active ${selectedRole === 'staff' ? 'staff members' : selectedRole + 's'} in the system.`
                        : selectedShift !== 'all'
                          ? `No team members assigned to the ${shifts.find(s => s.value === selectedShift)?.label.toLowerCase()}.`
                          : 'No active team members in the system.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {teamMembersForAttendance.map((teamMemberItem) => {
                  const currentStatus = getCurrentStatus(teamMemberItem.id);
                  
                  return (
                    <div key={teamMemberItem.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                            <Users className="w-3 h-3 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{teamMemberItem.full_name}</h3>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {teamMemberItem.shift ? (
                                shifts.find(s => s.value === teamMemberItem.shift)?.label || teamMemberItem.shift
                              ) : (
                                'No shift assigned'
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {currentStatus?.isSubmitted && currentStatus.status && (
                          <div className="flex items-center space-x-1">
                            {currentStatus.isCombined ? (
                              <>
                                <div className="px-2 py-1 rounded-full text-xs font-medium border bg-yellow-50 border-yellow-200 text-yellow-800">
                                  <div className="flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    <span>Late</span>
                                  </div>
                                </div>
                                <div className="px-2 py-1 rounded-full text-xs font-medium border bg-orange-50 border-orange-200 text-orange-800">
                                  <div className="flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    <span>Left Early</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentStatus.status)}`}>
                            <div className="flex items-center">
                              {getStatusIcon(currentStatus.status)}
                              <span className="ml-1 capitalize">
                                {currentStatus.status === 'left_early' ? 'Left Early' : currentStatus.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status Buttons */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 gap-2">
                          <button
                            onClick={() => handleStatusChange(teamMemberItem.id, 'on_time')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border text-center ${
                              currentStatus?.status === 'on_time' && !currentStatus?.selectedStatuses?.size
                                ? 'bg-green-100 border-green-500 text-green-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              <span>On Time</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(teamMemberItem.id, 'late')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border text-center ${
                              currentStatus?.selectedStatuses?.has('late')
                                ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-400'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              <span>Late</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(teamMemberItem.id, 'left_early')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border text-center ${
                              currentStatus?.selectedStatuses?.has('left_early')
                                ? 'bg-orange-100 border-orange-500 text-orange-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              <span>Left Early</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(teamMemberItem.id, 'no_show')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border text-center ${
                              currentStatus?.status === 'no_show' && !currentStatus?.selectedStatuses?.size
                                ? 'bg-red-100 border-red-500 text-red-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <XCircle className="w-3 h-3 mr-1" />
                              <span>No Show</span>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => handleStatusChange(teamMemberItem.id, 'day_off')}
                            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border text-center ${
                              currentStatus?.status === 'day_off' && !currentStatus?.selectedStatuses?.size
                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              <span>Day Off</span>
                            </div>
                          </button>
                        </div>

                        {/* Time Input Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {/* Clock In Time for Late */}
                          {currentStatus?.selectedStatuses?.has('late') && (
                            <div className="bg-yellow-50 rounded-md p-2">
                              <label className="block text-xs font-medium text-yellow-800 mb-1">
                                Clock In Time (auto-saves)
                              </label>
                              <input
                                type="time"
                                value={currentStatus?.clockInTime || ''}
                                onChange={(e) => {
                                  handleClockInTimeChange(teamMemberItem.id, e.target.value);
                                }}
                                className="w-full px-2 py-1 border border-yellow-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-transparent text-xs"
                              />
                            </div>
                          )}

                          {/* Clock Out Time for Left Early */}
                          {currentStatus?.selectedStatuses?.has('left_early') && (
                            <div className="bg-orange-50 rounded-md p-2">
                              <label className="block text-xs font-medium text-orange-800 mb-1">
                                Clock Out Time (auto-saves)
                              </label>
                              <input
                                type="time"
                                value={currentStatus?.clockOutTime || ''}
                                onChange={(e) => {
                                  handleClockOutTimeChange(teamMemberItem.id, e.target.value);
                                }}
                                className="w-full px-2 py-1 border border-orange-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* No Show Notes */}
                        {currentStatus?.status === 'no_show' && !currentStatus?.selectedStatuses?.size && (
                          <div className="bg-red-50 rounded-md p-2">
                            <label className="block text-xs font-medium text-red-800 mb-1">
                              Reason/Notes (auto-saves)
                            </label>
                            <textarea
                              value={currentStatus?.notes || ''}
                              onChange={(e) => {
                                const newNotes = e.target.value;
                                setAttendanceData(prev => ({
                                  ...prev,
                                  [teamMemberItem.id]: {
                                    ...prev[teamMemberItem.id],
                                    status: 'no_show',
                                    notes: newNotes,
                                    clockInTime: ''
                                  }
                                }));
                                handleNotesChange(teamMemberItem.id, newNotes);
                              }}
                              className="w-full px-2 py-1 border border-red-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-transparent text-xs"
                              rows={1}
                              placeholder="Enter reason..."
                            />
                          </div>
                        )}

                        {/* Day Off Notes */}
                        {currentStatus?.status === 'day_off' && !currentStatus?.selectedStatuses?.size && (
                          <div className="bg-blue-50 rounded-md p-2">
                            <label className="block text-xs font-medium text-blue-800 mb-1">
                              Day Off Reason (auto-saves)
                            </label>
                            <textarea
                              value={currentStatus?.notes || ''}
                             onChange={(e) => {
                               const newNotes = e.target.value;
                               // Update local state immediately for responsive typing
                               setAttendanceData(prev => ({
                                 ...prev,
                                 [teamMemberItem.id]: {
                                   ...prev[teamMemberItem.id],
                                   status: 'day_off',
                                   notes: newNotes,
                                   clockInTime: ''
                                 }
                               }));
                               // Then handle the database update
                               handleNotesChange(teamMemberItem.id, newNotes);
                             }}
                              className="w-full px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs bg-blue-50"
                              rows={1}
                              placeholder="Vacation, sick, etc..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Monthly Grid View */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Monthly Attendance Grid - {new Date(selectedMonth + '-01T12:00:00').toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </h2>
              {(() => {
                console.log(`📅 [MONTHLY VIEW] Rendering monthly view for: ${selectedMonth}`);
                console.log(`👥 [MONTHLY VIEW] Team members to display: ${teamMembersForAttendance.length}`);
                console.log(`📊 [MONTHLY VIEW] Total attendance records: ${attendanceRecords.length}`);
                console.log(`🎯 [MONTHLY VIEW] Records for 2025-09-28:`, attendanceRecords.filter(r => r.date === '2025-09-28'));
                const days = getDaysInMonth();
                console.log(`📆 [MONTHLY VIEW] Days in month: ${days.length}`, days.map(d => d.date));
                return null;
              })()}
            </div>

            {teamMembersForAttendance.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No team members found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery 
                    ? `No team members found matching "${searchQuery}".`
                    : selectedRole !== 'all' && selectedShift !== 'all'
                      ? `No ${selectedRole === 'staff' ? 'staff members' : selectedRole + 's'} assigned to the ${shifts.find(s => s.value === selectedShift)?.label.toLowerCase()}.`
                      : selectedRole !== 'all'
                        ? `No active ${selectedRole === 'staff' ? 'staff members' : selectedRole + 's'} in the system.`
                        : selectedShift !== 'all'
                          ? `No team members assigned to the ${shifts.find(s => s.value === selectedShift)?.label.toLowerCase()}.`
                          : 'No active team members in the system.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200">
                        Team Member
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px] border-r border-gray-200">
                        Days Worked
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px] border-r border-gray-200">
                        Missed Hours
                      </th>
                      {getDaysInMonth().map((day) => (
                        <th key={day.day} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[40px]">
                         <div className="text-xs text-gray-400 mb-1">
                           {new Date(`${selectedMonth}-${day.day.toString().padStart(2, '0')}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2)}
                         </div>
                          {day.day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {teamMembersForAttendance.map((teamMemberItem) => (
                      <tr key={teamMemberItem.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white border-r border-gray-200">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                              <Users className="w-3 h-3 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{teamMemberItem.full_name}</div>
                              <div className="text-xs text-gray-500">
                                {teamMemberItem.shift ? (
                                  shifts.find(s => s.value === teamMemberItem.shift)?.label.split(' ')[0] || teamMemberItem.shift
                                ) : (
                                  'No shift'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center border-r border-gray-200">
                          <div className="text-sm font-semibold text-gray-900">
                            {(() => {
                              const chatterRecords = attendanceRecords.filter(record => record.team_member_id === teamMemberItem.id);
                              const workedDays = chatterRecords.filter(record => 
                                record.status === 'on_time' || record.status === 'late' || record.status === 'left_early' || record.status === 'late_and_left_early'
                              ).length;
                              return workedDays;
                            })()}
                          </div>
                          <div className="text-xs text-gray-500">days</div>
                        </td>
                        <td className="px-2 py-2 text-center border-r border-gray-200">
                          <div className="text-sm font-semibold text-red-600">
                            {(() => {
                              const chatterRecords = attendanceRecords.filter(record => 
                                record.team_member_id === teamMemberItem.id && (record.status === 'late' || record.status === 'left_early' || record.status === 'late_and_left_early')
                              );
                              
                              
                              let totalMissedHours = 0;
                              
                              chatterRecords.forEach((record, index) => {
                                let lateHours = 0;
                                let earlyHours = 0;
                                
                                
                                // Calculate late hours
                                if (record.clock_in_time && teamMemberItem.shift) {
                                  const shiftStartTimes = {
                                    '10-6': '10:00',
                                    '6-2': '18:00', 
                                    '2-10': '02:00'
                                  };
                                  
                                  const shiftStart = shiftStartTimes[teamMemberItem.shift as keyof typeof shiftStartTimes];
                                  if (shiftStart) {
                                    const [startHour, startMinute] = shiftStart.split(':').map(Number);
                                    const [clockHour, clockMinute] = record.clock_in_time.split(':').map(Number);
                                    
                                    const shiftStartMinutes = startHour * 60 + startMinute;
                                    const clockInMinutes = clockHour * 60 + clockMinute;
                                    
                                    
                                    // Handle overnight shifts
                                    let actualClockInMinutes = clockInMinutes;
                                    if (teamMemberItem.shift === '2-10' && clockHour >= 2 && clockHour < 10) {
                                      // Normal case for 2-10 shift
                                    } else if (teamMemberItem.shift === '6-2' && clockHour >= 18) {
                                      // Normal case for 6-2 shift (same day)
                                    } else if (teamMemberItem.shift === '6-2' && clockHour < 6) {
                                      // Next day for 6-2 shift
                                      actualClockInMinutes = clockInMinutes + (24 * 60);
                                    }
                                    
                                    if (actualClockInMinutes > shiftStartMinutes) {
                                      const missedMinutes = actualClockInMinutes - shiftStartMinutes;
                                      lateHours = missedMinutes / 60;
                                    }
                                  }
                                }
                                
                                // Calculate early departure hours
                                if (record.clock_out_time && teamMemberItem.shift && (record.status === 'left_early' || record.status === 'late_and_left_early')) {
                                  const shiftEndTimes = {
                                    '10-6': '18:00',
                                    '6-2': '02:00', 
                                    '2-10': '10:00'
                                  };
                                  
                                  const shiftEnd = shiftEndTimes[teamMemberItem.shift as keyof typeof shiftEndTimes];
                                  if (shiftEnd) {
                                    const [endHour, endMinute] = shiftEnd.split(':').map(Number);
                                    const [clockHour, clockMinute] = record.clock_out_time.split(':').map(Number);
                                    
                                    const shiftEndMinutes = endHour * 60 + endMinute;
                                    const clockOutMinutes = clockHour * 60 + clockMinute;
                                    
                                    
                                    // Handle overnight shifts
                                    let actualShiftEndMinutes = shiftEndMinutes;
                                    if (teamMemberItem.shift === '6-2' && endHour < 6) {
                                      // Next day for 6-2 shift end
                                      actualShiftEndMinutes = shiftEndMinutes + (24 * 60);
                                    }
                                    
                                    if (clockOutMinutes < actualShiftEndMinutes) {
                                      const missedMinutes = actualShiftEndMinutes - clockOutMinutes;
                                      earlyHours = missedMinutes / 60;
                                    }
                                  }
                                }
                                
                                const recordMissedHours = lateHours + earlyHours;
                                totalMissedHours += recordMissedHours;
                              });
                              
                              return totalMissedHours > 0 ? totalMissedHours.toFixed(1) : '0';
                            })()}
                          </div>
                          <div className="text-xs text-gray-500">hours</div>
                        </td>
                        {getDaysInMonth().map((day) => {
                          const attendanceRecord = getAttendanceForDate(teamMemberItem.id, day.date);
                          const isToday = day.date === new Date().toISOString().split('T')[0];
                          const isFuture = new Date(day.date) > new Date();
                          
                          // Check if it's the dedicated combined status
                          const isCombined = attendanceRecord?.status === 'late_and_left_early';
                          
                          return (
                            <td key={day.day} className={`px-2 py-2 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                              {isFuture ? (
                                <div className="w-4 h-4 mx-auto bg-gray-100 rounded-full opacity-50" />
                              ) : isCombined ? (
                                <div className="flex justify-center space-x-0.5">
                                  <AlertCircle className="w-3 h-3 text-yellow-600" />
                                  <AlertCircle className="w-3 h-3 text-orange-600" />
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  {getAttendanceIcon(attendanceRecord?.status || null)}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Legend for Monthly View */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-700">On Time</span>
              </div>
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-gray-700">Late</span>
              </div>
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-gray-700">Left Early</span>
              </div>
              <div className="flex items-center">
                <XCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-gray-700">No Show</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 rounded-full mr-2" />
                <span className="text-gray-700">Not Recorded</span>
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-gray-700">Day Off</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-100 rounded-full mr-2" />
                <span className="text-gray-700">Today</span>
              </div>
              <div className="flex items-center">
                <div className="flex space-x-1">
                  <AlertCircle className="w-3 h-3 text-yellow-600" />
                  <AlertCircle className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-gray-700 ml-2">Late + Left Early</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Attendance;