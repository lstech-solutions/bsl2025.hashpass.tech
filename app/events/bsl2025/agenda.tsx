import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useEvent } from '../../../contexts/EventContext';
import { useTheme } from '../../../hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import EventBanner from '../../../components/EventBanner';
import UnifiedSearchAndFilter from '../../../components/UnifiedSearchAndFilter';
import { EVENTS } from '../../../config/events';
import { 
  AgendaItem, 
  AgendaType,
  getAgendaTypeColor,
  getAgendaTypeIcon,
  getDefaultDurationMinutes,
  formatClock,
  parseEventISO,
  formatTimeRange
} from '../../../types/agenda';

const { width } = Dimensions.get('window');

export default function BSL2025AgendaScreen() {
  const { event } = useEvent();
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(isDark, colors);

  const [agendaByDay, setAgendaByDay] = useState<{ [key: string]: AgendaItem[] }>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [usingJsonFallback, setUsingJsonFallback] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState<number | null>(null);
  const [isEventPeriod, setIsEventPeriod] = useState(false);
  const [filteredAgenda, setFilteredAgenda] = useState<AgendaItem[]>([]);
  const [showNotLiveDetails, setShowNotLiveDetails] = useState(false);

  // Helper functions used in effects and render
  const checkEventPeriod = () => {
    const now = new Date();
    // Event runs Nov 12-14, 2025 (Medellín, Colombia, UTC-05)
    const start = new Date('2025-11-12T00:00:00-05:00');
    const end = new Date('2025-11-14T23:59:59-05:00');
    setIsEventPeriod(now >= start && now <= end);
  };

  const getTabLabel = (dayKey: string) => {
    // Expect keys like "Day 1 - November 12"
    const parts = dayKey.split(' - ');
    return parts[0] || dayKey;
  };

  const getTabTheme = (dayKey: string) => {
    if (dayKey.includes('Day 1')) return 'Regulación, Bancos Centrales e Infraestructura del Dinero Digital';
    if (dayKey.includes('Day 2')) return 'PSAV, Compliance, Custodia y Tokenización';
    if (dayKey.includes('Day 3')) return 'Stablecoins y DeFi: Integrando el Mundo Financiero Global';
    return '';
  };

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filters for UnifiedSearchAndFilter
  const filterGroups = [
    {
      key: 'type',
      label: 'Type',
      type: 'single' as const,
      options: [
        { key: 'keynote', label: 'Keynote', icon: 'mic' },
        { key: 'panel', label: 'Panel', icon: 'group' },
        { key: 'break', label: 'Break', icon: 'free-breakfast' },
        { key: 'meal', label: 'Meal', icon: 'restaurant' },
        { key: 'registration', label: 'Registration', icon: 'person-add' },
      ],
    },
    {
      key: 'speakers',
      label: 'Speakers',
      type: 'chips' as const,
      options: [],
    },
  ];

  const customAgendaFilterLogic = (
    data: AgendaItem[],
    filters: { [key: string]: any },
    searchQuery: string
  ) => {
    let items = data;
    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      items = items.filter((it) =>
        (it.title && it.title.toLowerCase().includes(q)) ||
        (it.description && it.description.toLowerCase().includes(q)) ||
        (it.type && it.type.toLowerCase().includes(q)) ||
        ((it.speakers || []).some((s) => s.toLowerCase().includes(q)))
      );
    }
    if (filters?.type) {
      items = items.filter((it) => it.type === filters.type);
    }
    if (filters?.speakers) {
      items = items.filter((it) => (it.speakers || []).includes(filters.speakers));
    }
    return items;
  };

  // Load agenda from database first, fallback to hardcoded config only on error
  useEffect(() => {
    const loadAgenda = async () => {
      try {
        setLoading(true);
        setUsingJsonFallback(false);
        setServiceStatus('unknown');
        console.log('📅 Attempting to load agenda from database...');
        
        // First check agenda status - remove any trailing slashes before query params
        const statusResponse = await fetch('/api/bslatam/agenda-status?eventId=bsl2025'.replace(/\/+\?/, '?'));
        const statusResult = await statusResponse.json();
        
        if (statusResponse.ok && statusResult.hasData) {
          console.log('✅ Live agenda data available:', statusResult.itemCount, 'items');
          setIsLive(true);
          setLastUpdated(statusResult.lastUpdated);
          setServiceStatus('running');
          
          // Load the actual agenda data - remove any trailing slashes before query params
          const response = await fetch('/api/bslatam/agenda?eventId=bsl2025'.replace(/\/+\?/, '?'));
          const result = await response.json();
          
          if (response.ok && result.data && result.data.length > 0) {
            console.log('✅ Loaded live agenda from database:', result.data.length, 'items');
            setAgenda(result.data);
          } else {
            console.warn('⚠️ Status showed data but fetch failed, using JSON fallback');
            const fallbackAgenda = event?.agenda || EVENTS.bsl2025.agenda || [];
            setAgenda(fallbackAgenda);
            setIsLive(false);
            setUsingJsonFallback(true);
            setServiceStatus('stopped');
          }
        } else if (statusResponse.ok && !statusResult.hasData) {
          console.warn('⚠️ No live agenda data in database, showing JSON fallback');
          console.log('📄 Event object:', event);
          console.log('📄 JSON fallback data:', event?.agenda?.length || 0, 'items');
          // No live data - show JSON fallback with "not live" indicator
          const fallbackAgenda = event?.agenda || EVENTS.bsl2025.agenda || [];
          console.log('📄 Setting fallback agenda:', fallbackAgenda.length, 'items');
          setAgenda(fallbackAgenda);
          setIsLive(false);
          setLastUpdated(null);
          setUsingJsonFallback(true);
          setServiceStatus('stopped');
        } else {
          console.warn('⚠️ Database error, using JSON fallback');
          console.log('📄 JSON fallback data:', event?.agenda?.length || 0, 'items');
          // Database error - use JSON fallback
          const fallbackAgenda = event?.agenda || EVENTS.bsl2025.agenda || [];
          setAgenda(fallbackAgenda);
          setIsLive(false);
          setUsingJsonFallback(true);
          setServiceStatus('stopped');
        }
      } catch (error) {
        console.error('❌ Network error loading agenda from database:', error);
        console.log('🔄 Using JSON fallback due to network error');
        console.log('📄 JSON fallback data:', event?.agenda?.length || 0, 'items');
        // Network error - use JSON fallback
        const fallbackAgenda = event?.agenda || EVENTS.bsl2025.agenda || [];
        setAgenda(fallbackAgenda);
        setIsLive(false);
        setUsingJsonFallback(true);
        setServiceStatus('stopped');
      } finally {
        setLoading(false);
      }
    };

    loadAgenda();
  }, [event?.agenda]);

  // Ensure filteredAgenda is populated when agenda loads
  useEffect(() => {
    if (agenda && agenda.length > 0) {
      setFilteredAgenda(agenda);
    } else {
      setFilteredAgenda([]);
    }
  }, [agenda]);

  // Check if we're in the event period
  useEffect(() => {
    checkEventPeriod();
  }, []);

  // Countdown timer for next update (every 5 minutes) - only during event period
  useEffect(() => {
    if (!isLive || !isEventPeriod) return;

    const updateInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    let countdown = updateInterval;

    const timer = setInterval(() => {
      countdown -= 1000;
      setNextUpdateCountdown(countdown);

      if (countdown <= 0) {
        countdown = updateInterval;
        // Trigger a refresh
        const refreshAgenda = async () => {
          try {
            const response = await fetch('/api/bslatam/agenda?eventId=bsl2025');
            const result = await response.json();
            if (response.ok && result.data && result.data.length > 0) {
              setAgenda(result.data);
              setLastUpdated(new Date().toISOString());
            }
          } catch (error) {
            console.error('Auto-refresh failed:', error);
          }
        };
        refreshAgenda();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isLive, isEventPeriod]);

  // Group agenda by day
  useEffect(() => {
    if (loading) return;
    
    if (agenda.length === 0) {
      // No agenda data - clear the grouped data
      console.log('📅 No agenda data to group, clearing agendaByDay');
      setAgendaByDay({});
      return;
    }
    
    console.log('📅 Grouping agenda data:', agenda.length, 'items');
    console.log('📅 First agenda item:', agenda[0]);
    const grouped: { [key: string]: AgendaItem[] } = {};
    
    // Check if agenda items have day information from database
    const hasDayInfo = agenda.some(item => (item as any).day);
    console.log('📅 Has day info from database:', hasDayInfo);
    
    if (hasDayInfo) {
      const dayValues = agenda.map(item => (item as any).day).filter(Boolean);
      console.log('📅 Day values found:', [...new Set(dayValues)]);
    }
    
    if (hasDayInfo) {
      // Group by day column from database
      console.log('📅 Using database day information');
      
      // Check if the day values are simple (1, 2, 3) or complex (with thematic names)
      const dayValues = agenda.map(item => (item as any).day).filter(Boolean);
      const uniqueDays = [...new Set(dayValues)];
      console.log('📅 Unique day values:', uniqueDays);
      
      // Group by day, handling both simple and complex day names
      agenda.forEach(item => {
        const day = (item as any).day;
        if (day) {
          let dayKey: string;
          let dayName: string;
          
          // Extract day number from complex day names
          if (day.includes('Día 1')) {
            dayKey = 'Day 1 - November 12';
            dayName = 'Regulación, Bancos Centrales e Infraestructura del Dinero Digital';
          } else if (day.includes('Día 2')) {
            dayKey = 'Day 2 - November 13';
            dayName = 'PSAV, Compliance, Custodia y Tokenización';
          } else if (day.includes('Día 3')) {
            dayKey = 'Day 3 - November 14';
            dayName = 'Stablecoins y DeFi: Integrando el Mundo Financiero Global';
          } else if (day === '1' || day === '2' || day === '3') {
            // Simple day numbers
            dayKey = `Day ${day} - November ${day === '1' ? '12' : day === '2' ? '13' : '14'}`;
            dayName = day === '1' ? 'Regulación, Bancos Centrales e Infraestructura del Dinero Digital' :
                     day === '2' ? 'PSAV, Compliance, Custodia y Tokenización' :
                     'Stablecoins y DeFi: Integrando el Mundo Financiero Global';
          } else {
            // Fallback for other formats
            dayKey = day;
            dayName = 'Event Day';
          }
          
          if (!grouped[dayKey]) {
            grouped[dayKey] = [];
          }
          grouped[dayKey].push(item);
        }
      });
      
      // Also handle items without day information
      const itemsWithoutDay = agenda.filter(item => !(item as any).day);
      if (itemsWithoutDay.length > 0) {
        console.log('📅 Found', itemsWithoutDay.length, 'items without day info, distributing them');
        // Distribute items without day info across the days
        const dayKeys = Object.keys(grouped).sort();
        if (dayKeys.length > 0) {
          itemsWithoutDay.forEach((item, index) => {
            const targetDay = dayKeys[index % dayKeys.length];
            grouped[targetDay].push(item);
          });
        } else {
          // If no days exist yet, create them from the items without day info
          const day1Items = itemsWithoutDay.slice(0, Math.ceil(itemsWithoutDay.length / 3));
          const day2Items = itemsWithoutDay.slice(Math.ceil(itemsWithoutDay.length / 3), Math.ceil(itemsWithoutDay.length * 2 / 3));
          const day3Items = itemsWithoutDay.slice(Math.ceil(itemsWithoutDay.length * 2 / 3));
          
          if (day1Items.length > 0) {
            grouped['Day 1 - November 12'] = day1Items;
          }
          if (day2Items.length > 0) {
            grouped['Day 2 - November 13'] = day2Items;
          }
          if (day3Items.length > 0) {
            grouped['Day 3 - November 14'] = day3Items;
          }
        }
      }
      
      console.log('📅 Grouped by database day column:', Object.keys(grouped).map(key => `${key}: ${grouped[key].length} items`));
    } else {
      // Fallback: distribute sessions across 3 days
      console.log('📅 No day info in database, using fallback distribution');
      const day1Items = agenda.slice(0, 4); // First 4 items for Day 1
      const day2Items = agenda.slice(4, 8); // Next 4 items for Day 2
      const day3Items = agenda.slice(8); // Remaining items for Day 3
      
      console.log('📅 Day distribution:', {
        day1: day1Items.length,
        day2: day2Items.length, 
        day3: day3Items.length
      });
      
      console.log('📅 Day 1 items:', day1Items.map(item => item.title));
      console.log('📅 Day 2 items:', day2Items.map(item => item.title));
      console.log('📅 Day 3 items:', day3Items.map(item => item.title));
      
      // Add Day 1 items
      if (day1Items.length > 0) {
        grouped['Day 1 - November 12'] = day1Items;
      }
      
      // Add Day 2 items
      if (day2Items.length > 0) {
        grouped['Day 2 - November 13'] = day2Items;
      }
      
      // Add Day 3 items
      if (day3Items.length > 0) {
        grouped['Day 3 - November 14'] = day3Items;
      }
      
      console.log('📅 Grouped after fallback distribution:', Object.keys(grouped));
    }

    // Sort items within each day by start time (supports DB ISO times)
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => {
        const da = parseEventISO((a as any).time as any);
        const db = parseEventISO((b as any).time as any);
        const va = isNaN(da.getTime()) ? 0 : da.getTime();
        const vb = isNaN(db.getTime()) ? 0 : db.getTime();
        return va - vb;
      });
    });

    // Sort days in correct order (Day 1, Day 2, Day 3)
    const sortedGrouped: { [key: string]: AgendaItem[] } = {};
    const dayOrder = ['Day 1 - November 12', 'Day 2 - November 13', 'Day 3 - November 14'];
    
    dayOrder.forEach(dayKey => {
      if (grouped[dayKey]) {
        sortedGrouped[dayKey] = grouped[dayKey];
      }
    });

    console.log('📅 Final grouped data:', Object.keys(sortedGrouped).map(key => `${key}: ${sortedGrouped[key].length} items`));
    setAgendaByDay(sortedGrouped);
    
    // Set first tab as active (Day 1)
    const firstTab = 'Day 1 - November 12';
    if (sortedGrouped[firstTab]) {
      console.log('📅 Setting active tab to:', firstTab);
      setActiveTab(firstTab);
    } else {
      // Fallback to first available tab
      const availableTabs = Object.keys(sortedGrouped);
      console.log('📅 Available tabs:', availableTabs);
      if (availableTabs.length > 0) {
        console.log('📅 Setting active tab to first available:', availableTabs[0]);
        setActiveTab(availableTabs[0]);
      }
    }
  }, [agenda, loading]);

  // Function to clean session titles by removing type prefixes
  const cleanSessionTitle = (title: string) => {
    // Remove common session type prefixes
    return title
      .replace(/^Keynote\s*–\s*/i, '')
      .replace(/^Panel\s*–\s*/i, '')
      .replace(/^Panel\s*\([^)]+\)\s*–\s*/i, '')
      .replace(/^Break\s*–\s*/i, '')
      .replace(/^Meal\s*–\s*/i, '')
      .replace(/^Registration\s*–\s*/i, '')
      .trim();
  };

  // Function to find speaker ID by name
  const findSpeakerId = (speakerName: string) => {
    // Try to find speaker in the event speakers data
    if (event?.speakers) {
      const speaker = event.speakers.find(s => 
        s.name.toLowerCase().includes(speakerName.toLowerCase()) ||
        speakerName.toLowerCase().includes(s.name.toLowerCase())
      );
      return speaker?.id;
    }
    return null;
  };

  // Function to handle speaker navigation
  const handleSpeakerPress = (speakerName: string) => {
    const speakerId = findSpeakerId(speakerName);
    if (speakerId) {
      router.push(`/events/bsl2025/speakers/${speakerId}`);
    }
  };

  // Render a single agenda card
  const renderAgendaItem = (item: AgendaItem) => (
    <View key={item.id} style={styles.agendaItem}>
      <View style={styles.agendaItemHeader}>
        <View style={styles.timeContainer}>
          <Text style={styles.agendaTime}>{formatTimeRange(item)}</Text>
          <View style={[styles.agendaTypeBadge, { backgroundColor: getAgendaTypeColor(item.type) }]}>
            <Text style={styles.agendaTypeText}>{item.type.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.agendaItemContent}>
        <Text style={styles.agendaTitle}>{cleanSessionTitle(item.title)}</Text>
        {item.description && (
          <Text style={styles.agendaDescription}>{item.description}</Text>
        )}

        {item.speakers && item.speakers.length > 0 && (
          <View style={styles.speakersContainer}>
            <MaterialIcons name="people" size={16} color={colors.text.secondary} />
            <View style={styles.speakersList}>
              {item.speakers.map((speaker, index) => {
                const speakerId = findSpeakerId(speaker);
                const isClickable = speakerId !== null;
                return (
                  <React.Fragment key={index}>
                    {isClickable ? (
                      <TouchableOpacity onPress={() => handleSpeakerPress(speaker)} style={styles.speakerLink}>
                        <Text style={[styles.agendaSpeakers, styles.clickableSpeaker]}>{speaker}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.agendaSpeakers}>{speaker}</Text>
                    )}
                    {index < (item.speakers?.length || 0) - 1 && (
                      <Text style={styles.speakerSeparator}>, </Text>
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {(() => {
          let location = '';
          if (item.type === 'keynote') {
            location = 'Main Stage';
          } else if (item.type === 'registration') {
            location = 'Registration Area';
          } else if (item.type === 'meal' || item.type === 'break') {
            return null;
          } else if (item.location) {
            location = item.location;
          }
          if (location) {
            return (
              <View style={styles.locationContainer}>
                <MaterialIcons name="location-on" size={16} color={colors.text.secondary} />
                <Text style={styles.agendaLocation}>{location}</Text>
              </View>
            );
          }
          return null;
        })()}
      </View>
    </View>
  );
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* Event Header */}
        <EventBanner
          title="Event Agenda"
          subtitle={`Conference Schedule • ${agenda.length} Sessions`}
          date="November 12-14, 2025 • Medellín, Colombia"
          showCountdown={true}
          showLiveIndicator={isLive}
        />

        {/* Tab Navigation - Centered with consistent sizing */}
        {Object.keys(agendaByDay).length > 0 && (
          <View style={styles.tabContainer}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScrollContent}
                contentInset={{ left: 0, right: 0 }}
                contentOffset={{ x: 0, y: 0 }}
                snapToInterval={128} // 120 (width) + 8 (margin)
                decelerationRate="fast"
                snapToAlignment="center"
              >
              {Object.keys(agendaByDay).map((dayKey) => (
                <TouchableOpacity
                  key={dayKey}
                  style={[
                    styles.tab,
                    activeTab === dayKey && styles.activeTab
                  ]}
                  onPress={() => setActiveTab(dayKey)}
                >
                  <Text style={[
                    styles.tabLabel,
                    activeTab === dayKey && styles.activeTabLabel
                  ]}>
                    {getTabLabel(dayKey)}
                  </Text>
                  <Text style={[
                    styles.tabTheme,
                    activeTab === dayKey && styles.activeTabTheme
                  ]}>
                    {getTabTheme(dayKey)}
                  </Text>
                  <Text style={[
                    styles.tabCount,
                    activeTab === dayKey && styles.activeTabCount
                  ]}>
                    {agendaByDay[dayKey].length} sessions
                  </Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>
          </View>
        )}


      {/* Live Status Details - Only during event period */}
      {!loading && isLive && isEventPeriod && agenda.length > 0 && (
        <View style={styles.liveStatusDetails}>
          <View style={styles.liveStatusRow}>
            <MaterialIcons name="update" size={14} color={colors.success.main} />
            <Text style={styles.liveStatusDetailText}>
              Auto-updating every 5 minutes during event
            </Text>
          </View>
          {nextUpdateCountdown && (
            <View style={styles.liveStatusRow}>
              <MaterialIcons name="timer" size={14} color={colors.text.secondary} />
              <Text style={styles.liveStatusDetailText}>
                Next update in {formatCountdown(nextUpdateCountdown)}
              </Text>
            </View>
          )}
          {lastUpdated && (
            <View style={styles.liveStatusRow}>
              <MaterialIcons name="access-time" size={14} color={colors.text.secondary} />
              <Text style={styles.liveStatusDetailText}>
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      )}


      {/* Unified Search and Filter Section */}
      {!loading && agenda.length > 0 && (
        <UnifiedSearchAndFilter
          data={agenda}
          onFilteredData={setFilteredAgenda}
          onSearchChange={() => {}}
          searchPlaceholder="Search sessions, speakers, or keywords..."
          searchFields={['title', 'description', 'type', 'speakers']}
          filterGroups={filterGroups}
          customFilterLogic={customAgendaFilterLogic}
          showResultsCount={true}
        />
      )}

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="schedule" size={48} color={colors.text.secondary} />
            <Text style={styles.loadingText}>Loading agenda...</Text>
            <Text style={styles.loadingSubtext}>Fetching latest schedule from database</Text>
          </View>
        ) : activeTab && agendaByDay[activeTab] ? (
          <View style={styles.agendaList}>
            {(() => {
              // Get filtered items for the active tab
              const filteredItems = filteredAgenda.filter(item => {
                const dayItems = agendaByDay[activeTab] || [];
                return dayItems.some(dayItem => String((dayItem as any).id) === String((item as any).id));
              });
              
              console.log('📅 Rendering filtered agenda items for', activeTab, ':', filteredItems.length, 'items');
              
              if (filteredItems.length === 0) {
                return (
                  <View style={styles.noResultsContainer}>
                    <MaterialIcons name="search-off" size={48} color={colors.text.secondary} />
                    <Text style={styles.noResultsText}>No sessions match your filters</Text>
                    <Text style={styles.noResultsSubtext}>Try adjusting your search or filters</Text>
                  </View>
                );
              }
              
              return filteredItems.map(renderAgendaItem);
            })()}
          </View>
        ) : (
          <View style={styles.noAgendaContainer}>
            <MaterialIcons name="event-busy" size={48} color={colors.text.secondary} />
            <Text style={styles.noAgendaText}>No agenda available</Text>
            <Text style={styles.noAgendaSubtext}>Check back later for the event schedule</Text>
            <View style={styles.noLiveIndicator}>
              <MaterialIcons name="schedule" size={16} color={colors.text.secondary} />
              <Text style={styles.noLiveText}>No live agenda data</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  </View>
  );
}

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  // Tab Styles - Consistent sizing and centering
  tabContainer: {
    backgroundColor: colors.background.default,
    paddingTop: 8,
    paddingBottom: 8,
    width: '100%',
  },
  tabScrollContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 100, // Slightly reduced height for mobile
    paddingHorizontal: 8,
  },
  tab: {
    width: 120, // Reduced width for mobile
    height: 80, // Reduced height for mobile
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 6,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 100, // Minimum width for touch targets
  },
  activeTab: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 12, // Slightly smaller font for mobile
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingHorizontal: 2, // Reduced padding
    height: 16, // Reduced height
    lineHeight: 14, // Adjusted line height
  },
  activeTabLabel: {
    color: '#FFFFFF',
  },
  tabTheme: {
    fontSize: 9, // Slightly smaller font for mobile
    color: colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
    height: 12, // Reduced height
    lineHeight: 11,
    marginBottom: 3, // Reduced margin
    overflow: 'hidden',
  },
  activeTabTheme: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabCount: {
    fontSize: 9, // Slightly smaller font for mobile
    color: colors.text.secondary,
    fontWeight: '600',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 4, // Reduced padding
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
    minWidth: 50, // Reduced minimum width
    textAlign: 'center',
    height: 14, // Reduced height
    lineHeight: 12, // Adjusted line height
  },
  activeTabCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  agendaList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  agendaItem: {
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  agendaItemHeader: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaTime: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  agendaTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  agendaTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  agendaItemContent: {
    padding: 16,
  },
  agendaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  agendaDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  speakersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  speakersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  agendaSpeakers: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 6,
    flex: 1,
  },
  clickableSpeaker: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  speakerLink: {
    // No additional styling needed, inherits from parent
  },
  speakerSeparator: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaLocation: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  noAgendaContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noAgendaText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  noAgendaSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  noLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  noLiveText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  statusIndicatorContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveBadge: {
    backgroundColor: colors.success,
  },
  notLiveBadge: {
    backgroundColor: '#8E8E93',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  liveStatusDetails: {
    backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.success.main,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveStatusDetailText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  serviceWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: isDark ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: colors.warning.main,
  },
  serviceWarningText: {
    fontSize: 12,
    color: colors.warning.main,
    marginLeft: 6,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  notLiveDetailsDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: colors.background.paper,
    borderRadius: 12,
    minWidth: 280,
    shadowColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    zIndex: 1000,
  },
  notLiveDetailsContent: {
    padding: 16,
  },
  notLiveDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  notLiveIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notLiveDetailsText: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
});
