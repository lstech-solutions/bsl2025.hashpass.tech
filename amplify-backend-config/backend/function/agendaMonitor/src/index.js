// BSL2025 Agenda Monitor - AWS Lambda Function
// Serverless version for Amplify hosting

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// AWS SDK v3 for Parameter Store
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const ssm = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const config = {
  supabase: {
    url: null, // Will be loaded from Parameter Store
    serviceRoleKey: null // Will be loaded from Parameter Store
  },
  website: {
    url: 'https://blockchainsummit.la/',
    userAgent: 'BSL2025-Agenda-Monitor-Lambda/1.0.0'
  },
  event: {
    id: 'bsl2025',
    name: 'BSL 2025',
    dates: {
      start: new Date('2025-11-12T00:00:00Z'),
      end: new Date('2025-11-14T23:59:59Z')
    }
  }
};

// Initialize Supabase client (will be set after loading credentials)
let supabase = null;

// Logger utility
const logger = {
  info: (message, meta = {}) => console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() })),
  warn: (message, meta = {}) => console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() })),
  error: (message, meta = {}) => console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() })),
  success: (message, meta = {}) => console.log(JSON.stringify({ level: 'success', message, ...meta, timestamp: new Date().toISOString() }))
};

// Load credentials from Parameter Store
async function loadCredentials() {
  try {
    const command = new GetParametersCommand({
      Names: [
        process.env.SUPABASE_URL_PARAMETER,
        process.env.SUPABASE_KEY_PARAMETER
      ],
      WithDecryption: true
    });
    const response = await ssm.send(command);
    const parameters = response.Parameters;

    const urlParam = parameters.find(p => p.Name === process.env.SUPABASE_URL_PARAMETER);
    const keyParam = parameters.find(p => p.Name === process.env.SUPABASE_KEY_PARAMETER);

    if (!urlParam || !keyParam) {
      throw new Error('Required parameters not found in Parameter Store');
    }

    config.supabase.url = urlParam.Value;
    config.supabase.serviceRoleKey = keyParam.Value;

    // Initialize Supabase client
    supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

    logger.info('Credentials loaded from Parameter Store');
    return true;
  } catch (error) {
    logger.error('Failed to load credentials from Parameter Store', { error: error.message });
    throw error;
  }
}

// Check if within event dates
function isWithinEventDates() {
  const now = new Date();
  return now >= config.event.dates.start && now <= config.event.dates.end;
}

// Scrape agenda from website
async function scrapeAgenda() {
  try {
    logger.info('Starting agenda scraping', { url: config.website.url });
    
    const response = await fetch(config.website.url, {
      headers: {
        'User-Agent': config.website.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const agendaData = parseAgendaFromHTML(html);
    
    logger.success(`Scraped ${agendaData.length} agenda items`);
    return agendaData;
  } catch (error) {
    logger.error('Agenda scraping failed', { error: error.message });
    // Fallback to known agenda data
    logger.warn('Using fallback agenda data');
    return getKnownAgendaData();
  }
}

// Parse agenda from HTML content
function parseAgendaFromHTML(html) {
  const agendaItems = [];
  
  // Pattern to match agenda items with time and title
  const agendaPattern = /(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})\s*###\s*([^<]+)/g;
  let match;
  
  let dayCounter = 1;
  let itemId = 1;
  
  while ((match = agendaPattern.exec(html)) !== null) {
    const time = match[1].trim();
    const title = match[2].trim();
    
    // Determine the day based on position in the agenda
    let day = 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12';
    if (itemId > 12) {
      day = 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13';
    }
    if (itemId > 24) {
      day = 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14';
    }
    
    // Determine type based on title keywords
    let type = 'keynote';
    if (title.toLowerCase().includes('panel')) {
      type = 'panel';
    } else if (title.toLowerCase().includes('almuerzo') || title.toLowerCase().includes('café')) {
      type = 'meal';
    } else if (title.toLowerCase().includes('registro')) {
      type = 'registration';
    } else if (title.toLowerCase().includes('clausura')) {
      type = 'keynote';
    }
    
    // Extract speakers if mentioned
    const speakers = [];
    if (title.includes('Rectora')) {
      speakers.push('Claudia Restrepo');
    }
    if (title.includes('Colombia Fintech')) {
      speakers.push('Gabriel Santos');
    }
    if (title.includes('Superintendencia Financiera')) {
      speakers.push('César Ferrari');
    }
    if (title.includes('Banco de la República')) {
      speakers.push('Leonardo Villar');
    }
    
    agendaItems.push({
      id: `agenda-${itemId}`,
      event_id: config.event.id,
      day: day,
      time: time,
      title: title,
      description: null,
      speakers: speakers.length > 0 ? speakers : null,
      type: type,
      location: 'Universidad EAFIT, Medellín',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    itemId++;
  }
  
  // If regex didn't work well, use the known agenda data
  if (agendaItems.length === 0) {
    logger.warn('Regex parsing failed, using known agenda data');
    return getKnownAgendaData();
  }
  
  return agendaItems;
}

// Fallback: Known agenda data
function getKnownAgendaData() {
  return [
    // Day 1 - November 12, 2025
    { id: 'agenda-1', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '08:00 - 09:00', title: 'Registro y café de bienvenida', type: 'registration', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-2', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '09:00 - 09:15', title: 'Palabras de apertura – Rectora de la Universidad EAFIT', type: 'keynote', speakers: ['Claudia Restrepo'], location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-3', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '09:20 – 09:45', title: 'Keynote – "Red regional de pruebas para dinero tokenizado"', type: 'keynote', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-4', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '09:50 – 10:25', title: 'Keynote – "Infraestructura Financiera Global del Futuro"', type: 'keynote', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-5', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '10:35 – 11:05', title: 'Keynote – Colombia Fintech – "El Rol de las Fintech en la Adopción del Dinero Digital en América Latina"', type: 'keynote', speakers: ['Gabriel Santos'], location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-6', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '11:10 – 11:45', title: 'Keynote – Superintendencia Financiera de Colombia – "El futuro de la supervisión y regulación financiera en la era digital"', type: 'keynote', speakers: ['César Ferrari'], location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-7', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '11:50 – 13:00', title: 'Panel – "CBDCs y el Futuro del Dinero en LatAm"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-8', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '13:00 – 14:30', title: 'Almuerzo Libre', type: 'meal', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-9', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '14:35 – 15:05', title: 'Keynote – "Activos Digitales, Blockchain y Tokenización de Activos"', type: 'keynote', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-10', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '15:10 – 16:20', title: 'Panel (Bancos Comerciales) – "Transformación Digital de la Banca Tradicional"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-11', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '16:25 – 17:35', title: 'Panel (Reguladores) – "Marco regulatorio para la innovación financiera en LatAm"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-12', event_id: config.event.id, day: 'Día 1 - Regulación, Bancos Centrales e Infraestructura del Dinero Digital 2025-11-12', time: '17:40 – 18:30', title: 'Panel – "El Futuro del Dinero Digital: Innovación, Confianza y Colaboración en LATAM"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    
    // Day 2 - November 13, 2025
    { id: 'agenda-13', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '08:00 - 09:00', title: 'Registro y café de bienvenida', type: 'registration', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-14', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '09:00 - 09:25', title: 'Keynote – "Escenario global de la regulación sobre los Activos Virtuales y PSAV"', type: 'keynote', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-15', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '09:30 - 10:30', title: 'Panel – "La regulación relevante a los PSAV: la práctica en LATAM"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-16', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '10:35 - 11:00', title: 'Keynote – "Custodia Institucional de Activos Digitales"', type: 'keynote', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-17', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '11:05 - 12:05', title: 'Panel – Finanzas Tradicionales y Activos Digitales: ¿Competencia o Complemento?', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-18', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '12:10 - 13:00', title: 'Panel - "El Rol de la Tokenización en la Evolución de los Mercados de Capitales"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-19', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '13:00 – 14:30', title: 'Almuerzo libre', type: 'meal', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-20', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '14:30 – 15:20', title: 'Panel – "PSAV y los bancos, el rol del Compliance"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-21', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '15:25 – 16:00', title: 'Panel – "Road to Adoption: Estrategias para la institucionalización de los activos tokenizados"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-22', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '16:05 – 17:00', title: 'Panel – "Tokenización de RWA"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-23', event_id: config.event.id, day: 'Día 2 - PSAV, Compliance, Custodia y Tokenización 2025-11-13', time: '17:05 – 18:00', title: 'Panel – "Blockchain y su fundamento técnico-financiero: Criptografía y smart contracts"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    
    // Day 3 - November 14, 2025
    { id: 'agenda-24', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '08:00 - 09:00', title: 'Registro y café de bienvenida', type: 'registration', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-25', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '09:00 - 09:30', title: 'Keynote – Banco de la República – "Digitalización e Innovación en el Banco de la República"', type: 'keynote', speakers: ['Leonardo Villar'], location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-26', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '09:35 - 10:05', title: 'Keynote – "Experiencia Global en Stablecoins"', type: 'keynote', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-27', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '10:10 - 11:10', title: 'Panel – "Stablecoins como Infraestructura: Más Allá del Dinero Digital"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-28', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '11:15 - 12:15', title: 'Panel – "Interoperabilidad y eficiencia en pagos cross-border"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-29', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '13:00 - 14:30', title: 'Almuerzo libre', type: 'meal', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-30', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '14:30 - 15:30', title: 'Panel – "Exchanges cripto: de plataformas de trading a infraestructura financiera global"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-31', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '15:35 - 16:35', title: 'Panel – "DeFi + TradFi: Nuevas sinergias en infraestructura financiera descentralizada"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-32', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '16:45 - 17:45', title: 'Panel de cierre – "Sistema Financiero Global en 2030: Visión, riesgos y oportunidades"', type: 'panel', location: 'Universidad EAFIT, Medellín' },
    { id: 'agenda-33', event_id: config.event.id, day: 'Día 3 - Stablecoins y DeFi: Integrando el Mundo Financiero Global 2025-11-14', time: '18:00 - 18:15', title: 'Clausura oficial del Blockchain Summit Latam', type: 'keynote', location: 'Universidad EAFIT, Medellín' }
  ].map(item => ({
    ...item,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}

// Generate hash of agenda data for change detection
async function generateAgendaHash(agendaData) {
  const crypto = require('crypto');
  const agendaString = JSON.stringify(agendaData.map(item => ({
    time: item.time,
    title: item.title,
    type: item.type,
    speakers: item.speakers
  })));
  return crypto.createHash('md5').update(agendaString).digest('hex');
}

// Update database with agenda data
async function updateDatabase(agendaData) {
  try {
    // Clear existing agenda
    const { error: deleteError } = await supabase
      .from('event_agenda')
      .delete()
      .eq('event_id', config.event.id);

    if (deleteError) throw deleteError;

    // Insert new agenda items
    const { data, error } = await supabase
      .from('event_agenda')
      .insert(agendaData);

    if (error) throw error;

    logger.success(`Updated database with ${agendaData.length} agenda items`);
    return { success: true, data };
  } catch (error) {
    logger.error('Database update failed', { error: error.message });
    throw error;
  }
}

// Main Lambda handler
exports.handler = async (event, context) => {
  try {
    logger.info('BSL2025 Agenda Monitor Lambda started', {
      eventType: event.source || 'manual',
      requestId: context.awsRequestId
    });

    // Load credentials from Parameter Store
    await loadCredentials();

    // Check if within event dates (unless forced)
    const forceMode = event.force || false;
    if (!forceMode && !isWithinEventDates()) {
      logger.info('Outside event dates, skipping check', {
        withinEventDates: false,
        forceMode: false
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Outside event dates, no action taken',
          withinEventDates: false,
          eventDates: {
            start: config.event.dates.start.toISOString(),
            end: config.event.dates.end.toISOString()
          }
        })
      };
    }

    // Scrape current agenda
    const currentAgenda = await scrapeAgenda();
    
    // Generate hash for change detection
    const currentHash = await generateAgendaHash(currentAgenda);
    
    // Get previous hash from environment or assume changed
    const previousHash = process.env.LAST_AGENDA_HASH;
    
    // Check if agenda has changed
    if (previousHash && previousHash === currentHash) {
      logger.info('No agenda changes detected', {
        hash: currentHash,
        itemsCount: currentAgenda.length
      });
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No changes detected',
          hash: currentHash,
          itemsCount: currentAgenda.length,
          changed: false
        })
      };
    }

    // Update database
    await updateDatabase(currentAgenda);
    
    logger.success('Agenda monitoring completed successfully', {
      hash: currentHash,
      itemsCount: currentAgenda.length,
      changed: true
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Agenda updated successfully',
        hash: currentHash,
        itemsCount: currentAgenda.length,
        changed: true,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    logger.error('Agenda monitoring failed', { 
      error: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Agenda monitoring failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
