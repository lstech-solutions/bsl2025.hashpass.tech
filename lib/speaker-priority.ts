// Speaker priority order for BSL 2025
// This defines the order in which speakers should appear in the search/list

export const SPEAKER_PRIORITY_ORDER = [
  'Claudia Restrepo',
  'Leonardo Villar',
  'César Ferrari',
  'Alberto Naudon',
  'José Outumuro',
  'Efraín Barraza',
  'Sandra Meza',
  'Sebastián Durán',
  'Ana Garcés',
  'Rocelo Lopes',
  'Juan Carlos Reyes',
  'Daniel Calvo',
  'Nagel Paulino',
  'Gabriel Santos',
  'María Paula Rodríguez',
  'César Tamayo',
  'Daniel Mangabeira',
  'Juan Pablo Rodríguez',
  'Willian Santos',
  'Rocío Alvarez-Ossorio',
  'Diego Fernández',
  'Steffen Härting',
  'Andres Florido',
  'Liz Bejarano',
  'Andrés Meneses',
  'Luther Maday',
  'Rafael Teruszkin',
  'Albi Rodríguez',
  'Judith Vergara',
  'William Durán',
  'Daniel Aguilar',
  'Rafael Gago',
  'Pablo Santos',
  'Ana María Zuluaga',
  'Alireza Siadat',
  'Omar Castelblanco',
  'Pedro Gutiérrez',
  'Marcos Carpio',
  'Nathaly Diniz',
  'Juan Pablo Salazar',
  'Santiago Mejía',
  'Andrés González',
  'Stephanie Sánchez',
  'Albert Prat',
  'Mónica Ramírez de Arellano',
  'Luisa Cárdenas',
  'Camilo Suárez',
  'Vivian Cruz',
  'Daniel Marulanda',
  'David Yao',
  'María Fernanda Marín',
  'Sebastián Zapata',
  'Kieve Huffman',
  'Pilar Álvarez',
  'Daniel Mesa',
  'Matias Marmisolle',
  'Karol Benavides',
  'Camilo Romero',
  'José Manuel Souto',
  'Edison Montoya',
  'Fernando Quirós',
  'Camila Santana',
  'Lizeth Jaramillo',
  'Mariangel García',
  'Edward Calderón',
  'Roberto Darrigrandi',
  'Arlette Salas',
  'Ed Marquez',
  'Young Cho',
  'Diego Osuna',
  'Paula Bermúdez',
  'Luis Castañeda',
  'Gerardo Lagos',
  'Mireya Acosta',
  'Juliana Franco',
  '0xj4an',
  'Mercedes Bidart',
  'Daniela Salcedo',
  'Michelle Arguelles',
  'Sebastián Ramírez',
  'Camilo Serna',
  'Javier Lozano',
  'Ximena Monclou',
  'Oscar Moratto',
  'Miguel Ángel Calero',
  'Lisa Parra',
  'Camila Ortegón',
  'Luis Miguel Arroyave',
  'Juan Carlos Pérez',
  'José Martínez',
  'Manuel Becker',
  'Manú Hersch',
  'Federico Biskupovich',
  'Alvaro Castro',
  'Nick Waytula',
  'Wilder Rosero',
];

// Create a map for quick lookup
export const SPEAKER_PRIORITY_MAP = new Map(
  SPEAKER_PRIORITY_ORDER.map((name, index) => [name.toLowerCase(), index])
);

/**
 * Sort speakers by priority order (if in priority list) or alphabetically (if not)
 */
export function sortSpeakersByPriority(speakers: Array<{ name: string }>): Array<{ name: string }> {
  return [...speakers].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    const aPriority = SPEAKER_PRIORITY_MAP.get(aName);
    const bPriority = SPEAKER_PRIORITY_MAP.get(bName);
    
    // Both in priority list - sort by priority
    if (aPriority !== undefined && bPriority !== undefined) {
      return aPriority - bPriority;
    }
    
    // Only a in priority list - a comes first
    if (aPriority !== undefined) {
      return -1;
    }
    
    // Only b in priority list - b comes first
    if (bPriority !== undefined) {
      return 1;
    }
    
    // Neither in priority list - sort alphabetically
    return aName.localeCompare(bName);
  });
}

