const DIMENSIONS = [
  {
    key: 'gobernanza',
    title: 'Gobernanza e Institucionalidad',
    enablers: [
      {
        key: 'agenda_digital',
        name: 'Agenda Digital',
        description: 'Documento estratégico que establece los objetivos prioritarios para la transformación digital a nivel de país, incluyendo medidas para todos los sectores. Se trata de un documento de alto nivel, donde habitualmente, el gobierno central establece esas directrices a través de un decreto, ley o similar.',
      },
      {
        key: 'estrategia_transformacion_gobierno',
        name: 'Estrategia de Transformación Digital del Gobierno',
        description: 'La estrategia nacional de transformación digital es el elemento articulador que define el camino para avanzar hacia un estado digital. Plantea una visión holística que abarca no solo al Gobierno y las distintas instituciones públicas de todos los niveles de gobierno, sino también las relaciones con los ciudadanos, el sector privado, académico y el sector sin fines de lucro. Establece qué se quiere conseguir, cómo hacerlo y cómo gestionarlo desde un punto de vista de comunicación, riesgos y aprovisionamiento.',
      },
      {
        key: 'estrategia_datos',
        name: 'Estrategia de Datos',
        description: 'La Estrategia Nacional de Datos busca optimizar el uso de los datos como un recurso para la toma de decisiones, y establece directrices para la gestión y aprovechamiento de los datos en la administración pública y/o en la sociedad en general. También puede abarcar otros campos, como el uso seguro de los datos, la promoción de una cultura del dato, y el fomento de estándares abiertos y de calidad.',
      },
      {
        key: 'estrategia_ia',
        name: 'Estrategia de Inteligencia Artificial',
        description: 'La Estrategia de Inteligencia Artificial promueve la adopción responsable y efectiva de la inteligencia artificial en el sector público para maximizar sus beneficios. Establece principios y lineamientos que permiten aprovechar el potencial de la IA en la mejora de servicios públicos, al mismo tiempo que se gestionan adecuadamente los riesgos éticos, sociales y técnicos asociados a su uso.',
      },
      {
        key: 'estrategia_ciberseguridad',
        name: 'Estrategia de Ciberseguridad',
        description: 'La Estrategia Nacional de Ciberseguridad está enfocada en proteger los activos digitales gubernamentales frente a amenazas cibernéticas. Define un marco de actuación para prevenir, detectar, responder y recuperarse de incidentes de seguridad, promoviendo una cultura institucional de protección digital. Incluye principios, objetivos y líneas de acción que fortalecen la resiliencia del sector público, garantizando la continuidad operativa de los servicios.',
      },
      {
        key: 'planes_infraestructura_critica',
        name: 'Planes de protección de infraestructura crítica',
        description: 'Los Planes de protección de infraestructura crítica son instrumentos específicos diseñados para asegurar la continuidad operativa de infraestructuras vitales ante amenazas digitales o físicas. Estos planes identifican activos estratégicos del Estado —como redes de comunicación, centros de datos, servicios financieros o sistemas de salud— y establecen medidas de prevención, mitigación y respuesta ante posibles interrupciones. Su objetivo es garantizar la estabilidad del funcionamiento gubernamental y la seguridad de los ciudadanos frente a eventos adversos.',
      },
      {
        key: 'institucion_rectora_gobierno_digital',
        name: 'Institución Rectora de Gobierno Digital',
        description: 'La Institución Rectora de Gobierno Digital es la entidad responsable de impulsar y coordinar la agenda de transformación digital del país. Su rol abarca desde el liderazgo en la definición de políticas y normativa TIC, hasta la gobernanza general del ecosistema digital público. También tiene la responsabilidad de garantizar la disponibilidad y funcionamiento de servicios tecnológicos comunes para todas las entidades del Estado, ya sea prestándolos directamente o coordinando su provisión. Su existencia es clave para asegurar coherencia, eficiencia y sostenibilidad en las iniciativas digitales del sector público.',
      },
      {
        key: 'autoridad_transparencia',
        name: 'Autoridad Transparencia y acceso a la información pública',
        description: 'Institución encargada de garantizar el acceso ciudadano a la información pública gubernamental y fomentar y supervisar la transparencia en el sector público.',
      },
      {
        key: 'autoridad_proteccion_datos',
        name: 'Autoridad de Protección de Datos Personales',
        description: 'Entidad que regula y garantiza la privacidad y protección de los datos personales de los ciudadanos.',
      },
      {
        key: 'institucion_rectora_ciberseguridad',
        name: 'Institución Rectora Ciberseguridad',
        description: 'Institución responsable de establecer directrices y coordinar la gestión nacional de ciberseguridad.',
      },
      {
        key: 'institucion_rectora_ia',
        name: 'Institución Rectora Inteligencia Artificial',
        description: 'Institución responsable de guiar o supervisar el uso ético de la inteligencia artificial en la administración pública y/o sector privado.',
      },
    ],
  },
  {
    key: 'marco_normativo',
    title: 'Marco Normativo',
    enablers: [
      {
        key: 'normativa_firma_digital',
        name: 'Normativa de Firma Digital',
        description: 'Regulación que establece los requisitos técnicos y legales para el uso de firmas digitales en el ámbito público y privado. Esta normativa debe garantizar que una firma digital tenga la misma validez jurídica que una firma manuscrita, definiendo sus condiciones de uso y aceptación. Al igual que la identificación digital, la normativa de firma digital debe contar con una regulación de alto nivel, detallar los principios de la ley con flexibilidad para afrontar los cambios tecnológicos, disponer de guías técnicas y brindar una solución tecnológica accesible y usable.',
      },
      {
        key: 'normativa_identidad_digital',
        name: 'Normativa de Identidad Digital',
        description: 'Normativa que regula el uso y la gestión de identidades digitales para garantizar un acceso seguro, confiable y universal a los servicios públicos en línea. Esta regulación define los mecanismos de autenticación, verificación y gestión del ciclo de vida de las credenciales digitales, asegurando su validez legal y técnica.',
      },
      {
        key: 'normativa_interoperabilidad',
        name: 'Normativa de Interoperabilidad',
        description: 'Normas que establecen cómo deben interactuar los sistemas tecnológicos entre entidades gubernamentales, garantizando el intercambio seguro, eficiente y compatible de información. Un marco normativo de interoperabilidad regula que los sistemas de información —de distintos sectores o de diferentes entidades dentro de un mismo sector— puedan comunicarse de forma estandarizada. Este marco también promueve la integración con el sector privado, la ciudadanía y, cuando corresponde, con sistemas de otros países, facilitando la prestación de servicios transfronterizos.',
      },
      {
        key: 'normativa_proteccion_datos',
        name: 'Normativa de Protección de Datos Personales',
        description: 'Regulación que establece los requisitos para proteger los datos personales gestionados por entidades públicas o privadas. Esta normativa debe girar en torno a la noción de “riesgo” para los derechos y libertades de los individuos, estableciendo un marco sólido de garantías. Entre sus elementos clave se encuentran: la creación de autoridades de control y supervisión, el principio de rendición de cuentas, y la exigencia de una base legítima para el tratamiento de datos. Además, debe definir claramente qué se considera como datos personales sensibles y establecer reglas específicas para su protección, regular el derecho de los ciudadanos a acceder a sus datos y conocer su uso, prever estructuras de gobernanza en protección de datos, y establecer condiciones estrictas de seguridad para los sistemas que los gestionan.',
      },
      {
        key: 'normativa_transparencia',
        name: 'Normativa Transparencia y acceso a la Información Pública',
        description: 'Normativa que regula el derecho ciudadano al acceso a la información generada, recopilada o financiada por el sector público. Establece los principios, mecanismos y obligaciones que deben seguir las instituciones para garantizar la transparencia activa y pasiva, permitiendo que cualquier persona pueda solicitar y obtener información pública sin necesidad de justificar su interés. Además, promueve la apertura proactiva de datos, la rendición de cuentas y el fortalecimiento de la confianza entre la ciudadanía y el Estado.',
      },
      {
        key: 'normativa_ciberseguridad',
        name: 'Normativa Ciberseguridad',
        description: 'Normativa que establece los requisitos mínimos de seguridad digital que deben adoptarse, como mínimo, en las instituciones públicas. Define lineamientos para la protección de sistemas, redes, infraestructuras y datos frente a amenazas cibernéticas, e impulsa la adopción de políticas de prevención, monitoreo, respuesta y recuperación ante incidentes. Esta normativa también puede establecer obligaciones en materia de gestión de riesgos, formación del personal, gobernanza de la seguridad de la información, y coordinación con entidades nacionales e internacionales para fortalecer la resiliencia del ecosistema digital gubernamental.',
      },
      {
        key: 'normativa_archivo_digital',
        name: 'Normativa de Archivo Digital',
        description: 'Regulación que establece los requisitos técnicos y legales para la conservación, gestión y acceso de documentos electrónicos oficiales a lo largo del tiempo.',
      },
      {
        key: 'normativa_ia',
        name: 'Normativa Inteligencia Artificial',
        description: 'Regulación que establece lineamientos éticos, jurídicos y técnicos para el desarrollo, adopción y uso de la inteligencia artificial en el sector público y privado. Esta normativa busca asegurar que los sistemas de IA sean transparentes, auditables, seguros, no discriminatorios y centrados en el ser humano.',
      },
    ],
  },
  {
    key: 'talento',
    title: 'Talento digital y gestión del cambio',
    enablers: [
      {
        key: 'marco_competencias_admin',
        name: 'Marco de competencias digitales en la administración',
        description: 'Conjunto estructurado de habilidades, conocimientos y actitudes digitales que deben poseer los funcionarios públicos para desempeñar sus funciones de manera eficaz en un entorno digital. Este marco establece los niveles esperados de competencia en áreas como el uso de herramientas tecnológicas, la gestión de datos, la seguridad digital, la comunicación en línea, la innovación y la resolución de problemas en entornos digitales.',
      },
      {
        key: 'competencias_ciudadania',
        name: 'Competencias digitales para la ciudadanía',
        description: 'Conjunto de habilidades, conocimientos y actitudes que permiten a los ciudadanos interactuar de forma segura, crítica y efectiva en entornos digitales. Estas competencias incluyen desde el uso básico de tecnologías digitales hasta la capacidad de comunicarse, colaborar, crear contenido, proteger datos personales y resolver problemas en línea.',
      },
      {
        key: 'coordinacion_talento_tic',
        name: 'Mecanismo coordinación talento TIC por parte ente rector digital',
        description: 'Capacidad del ente rector digital para coordinar de forma estratégica y operativa los recursos humanos y el talento TIC dentro del sector público. Esta función implica definir perfiles y competencias, promover la profesionalización del personal TIC, asignar recursos de manera eficiente y alinear las capacidades institucionales con los objetivos de la transformación digital.',
      },
    ],
  },
  {
    key: 'infraestructura',
    title: 'Infraestructura y herramientas tecnológicas',
    enablers: [
      {
        key: 'plataforma_interoperabilidad',
        name: 'Plataforma de Interoperabilidad',
        description: 'Plataforma tecnológica que facilita la comunicación y el intercambio seguro de datos, certificados y documentos entre instituciones públicas de forma estandarizada. Actúa como un punto central de conexión al que se integran distintos organismos para consultar y compartir información entre sí, eliminando la necesidad de pedir a los ciudadanos documentos que ya están en poder del Estado. Los servicios ofrecidos por esta plataforma pueden incluir operaciones automatizadas de verificación, validación y consulta de datos como lugar de residencia, identidad o acceso a los datos fiscales.',
      },
      {
        key: 'gsoc',
        name: 'Centro de Operaciones de Seguridad Gubernamental (GSOC)',
        description: 'Un centro de operaciones de seguridad (SOC por sus siglas en inglés) es una unidad organizacional que supervisa, analiza y protege a una organización de los ciberataques. Está compuesto por profesionales de IT y ciberseguridad, así como infraestructura técnica, herramientas y manuales de operaciones que le permiten detectar de manera temprana un incidente de ciberseguridad y escalarlo a los especialistas en respuesta a incidentes o eventualmente responderlos ellos mismos.',
      },
      {
        key: 'cert',
        name: 'Equipo de Respuesta a Incidentes de Seguridad (CERT)',
        description: 'Un equipo de respuesta a incidentes de seguridad informática, o CSIRT por sus siglas en inglés, es un grupo de profesionales de ciberseguridad que proporciona servicios y apoyo en torno a la evaluación, gestión, prevención y respuesta a incidentes de ciberseguridad.',
      },
      {
        key: 'pki',
        name: 'Infraestructura de clave pública (PKI)',
        description: 'La infraestructura de clave pública o PKI, por sus siglas en inglés, permite emitir, gestionar, renovar y revocar certificados digitales utilizados para la autenticación segura, la firma electrónica y el cifrado de información. Una PKI proporciona los mecanismos criptográficos necesarios para garantizar la integridad, confidencialidad y no repudio de las comunicaciones digitales entre ciudadanos, empresas y el Estado. Es un habilitador fundamental para servicios como la firma digital, la identidad digital y las transacciones electrónicas seguras, y debe operar bajo estándares robustos de seguridad y gobernanza.',
      },
      {
        key: 'expediente_digital',
        name: 'Expediente Digital',
        description: 'Sistema que permite la creación, organización, tramitación y conservación digital de expedientes administrativos de forma estructurada y segura. Sustituye el uso del papel por registros electrónicos, garantizando la trazabilidad, integridad y disponibilidad de la información a lo largo del ciclo de vida del expediente. Facilita la interoperabilidad entre instituciones, agiliza los procesos administrativos y mejora la eficiencia en la gestión pública.',
      },
      {
        key: 'nube_gubernamental',
        name: 'Nube Gubernamental',
        description: 'Plataforma de servicios tecnológicos en la nube, diseñada y gestionada específicamente para atender las necesidades del sector público. Proporciona infraestructura, almacenamiento, procesamiento y servicios digitales bajo demanda para las instituciones del Estado, promoviendo eficiencia, escalabilidad, seguridad y sostenibilidad.',
      },
      {
        key: 'georreferenciacion',
        name: 'Sistema de Georreferenciación',
        description: 'Plataforma tecnológica que permite asociar datos e información pública a ubicaciones geográficas específicas mediante coordenadas espaciales. Facilita la visualización, análisis y gestión territorial de políticas públicas, recursos y servicios del Estado. Este sistema es clave para la planificación urbana, el monitoreo de infraestructuras, la gestión de emergencias, el catastro, y otros usos estratégicos que requieren datos geoespaciales.',
      },
      {
        key: 'archivo_digital_centralizado',
        name: 'Sistema de Archivado digital centralizado',
        description: 'Plataforma centralizada para el almacenamiento seguro y gestión de archivos electrónicos gubernamentales. Este sistema garantiza la integridad, autenticidad y disponibilidad de los archivos digitales a lo largo del tiempo, cumpliendo con los requisitos legales y técnicos de preservación documental. Centralizar el archivado permite reducir duplicidades, facilitar el acceso transversal a la información, estandarizar prácticas archivísticas y asegurar una memoria institucional confiable en el entorno digital.',
      },
      {
        key: 'directorio_funcionarios',
        name: 'Directorio de Funcionarios',
        description: 'Plataforma digital que centraliza y organiza la información institucional sobre todas las entidades del sector público. Contiene datos como denominación oficial, estructura organizativa, funciones, ubicación, datos de contacto y enlaces a sus portales web. Este directorio permite mapear el ecosistema institucional del Estado.',
      },
      {
        key: 'directorio_entidades',
        name: 'Directorio de entidades públicas',
        description: 'Plataforma que ofrece información centralizada sobre entidades del sector público.',
      },
    ],
  },
  {
    key: 'servicios',
    title: 'Servicios digitales del Gobierno',
    enablers: [
      {
        key: 'portal_unico',
        name: 'Portal único de gobierno',
        description: 'El portal único es el espacio web que integra toda la información que puede interesar a la ciudadanía en un único punto, a través del cual se puede acceder a información de distintos organismos.',
      },
      {
        key: 'catalogo_tramites',
        name: 'Catálogo de Trámites',
        description: 'El catálogo de trámites consiste en un repositorio unificado donde se encuentran todos los trámites o procedimientos que realizan las entidades públicas y sus requisitos, de forma estandarizada, donde cada trámite está identificado y definido por un código, así como también las características que lo definen.',
      },
      {
        key: 'carpeta_ciudadana',
        name: 'Carpeta ciudadana',
        description: 'La carpeta ciudadana es el espacio web (conectado al punto único del gobierno) en el que las personas, una vez identificadas, pueden encontrar todos sus datos, certificados, constancias, comunicaciones y notificaciones, servicios, expedientes y demás relaciones con las entidades públicas, e idealmente con el sector privado, de manera integrada y organizada según la perspectiva de la ciudadanía.',
      },
      {
        key: 'red_atencion_ciudadana',
        name: 'Red Nacional de Atención Ciudadana',
        description: 'Red multicanal integrada por distintos medios de contacto —como web, teléfono, mensajería instantánea, correo electrónico y atención presencial— destinada a gestionar consultas, reclamos, solicitudes y orientación a la ciudadanía en todo el territorio nacional. Esta red permite brindar una experiencia coherente y accesible al ciudadano, independientemente del canal o punto de contacto utilizado.',
      },
      {
        key: 'plataforma_transparencia_participacion',
        name: 'Plataforma de Transparencia y Participación Ciudadana',
        description: 'Plataforma digital que permite a la ciudadanía acceder a información generada o custodiada por las administraciones públicas y participar activamente en los procesos de toma de decisiones del gobierno. Integra funcionalidades como consultas públicas, presupuestos participativos, visualización de datos abiertos, mecanismos de rendición de cuentas y espacios de diálogo con las instituciones.',
      },
      {
        key: 'pasarela_pago',
        name: 'Pasarela de Pago',
        description: 'La pasarela de pagos es el sistema de información que gestiona pagos y cobros, con su contabilidad asociada, por múltiples medios electrónicos, para que cuando el trámite administrativo lo exija no haya que realizar dichos pagos por medios tradicionales.',
      },
      {
        key: 'portal_datos_abiertos',
        name: 'Portal de Datos Abiertos',
        description: 'El portal de datos abiertos es el portal web que presenta un sistema agregado de conjuntos de datos abiertos, de fácil uso y navegación, con un buscador, que refleja la información asociada a los conjuntos de datos relevante, y que permite la descarga de los datos en múltiples formatos.',
      },
      {
        key: 'identidad_digital',
        name: 'Sistema de Identidad Digital',
        description: 'Sistema único para gestionar y autenticar identidades digitales del ciudadano, garantizando su reconocimiento en entornos digitales de forma segura, única, inequívoca y universal. Este servicio común permite a las personas identificarse electrónicamente ante cualquier entidad pública (y potencialmente, privada), habilitando el acceso a servicios digitales, la firma electrónica de documentos y la realización de trámites en línea.',
      },
      {
        key: 'cartera_identidades',
        name: 'Cartera de identidades',
        description: 'Aplicación o servicio digital que permite almacenar, gestionar y utilizar múltiples identidades digitales verificadas. Su objetivo es facilitar a los ciudadanos el acceso a servicios públicos y privados mediante credenciales electrónicas de identidad válidas, con la misma legitimidad que los documentos físicos. La cartera de identidades puede incluir documentos como DNI digital, licencias, certificados de vacunación o tarjetas de beneficios, y garantiza su autenticidad, incluso en entornos sin conexión.',
      },
      {
        key: 'firma_digital',
        name: 'Sistema de Firma Digital',
        description: 'Sistema que permite firmar documentos electrónicos garantizando su integridad, autenticidad y validez legal. Funciona como un portafirmas digital o plataforma de firma electrónica, permitiendo la remisión de documentos electrónicos firmados tanto en trámites administrativos como en procesos del ámbito privado. La firma digital es el conjunto de datos que, asociados a un documento electrónico, identifican de manera inequívoca al firmante y otorgan validez jurídica al documento firmado, asegurando que no haya sido manipulado o alterado tras la firma.',
      },
      {
        key: 'factura_electronica',
        name: 'Factura Electrónica',
        description: 'Sistema que permite la emisión, recepción, validación y almacenamiento de facturas en formato digital, con plena validez legal y fiscal. En el ámbito gubernamental, la factura electrónica agiliza los procesos de contratación, pago y control financiero, reduciendo el uso de papel, mejorando la trazabilidad y aumentando la transparencia.',
      },
      {
        key: 'contratacion_electronica',
        name: 'Contratación pública electrónica',
        description: 'Plataforma digital que permite gestionar de forma integral y transparente los procesos de compra y contratación de bienes, servicios y obras por parte del Estado. Abarca todas las etapas del ciclo de contratación —desde la planificación y publicación de licitaciones hasta la adjudicación, firma del contrato y seguimiento—, facilitando la participación de proveedores, reduciendo tiempos y costos, y fortaleciendo la competencia. Además, mejora la trazabilidad y la rendición de cuentas al integrar herramientas de monitoreo, análisis y datos abiertos sobre las contrataciones públicas.',
      },
    ],
  },
];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function buildMockStatus(seed) {
  const bucket = hashString(seed) % 100;
  if (bucket < 45) {
    return { status: 'yes', evidenceUrl: '#' };
  }
  if (bucket < 72) {
    return { status: 'in_development', evidenceUrl: null };
  }
  return { status: 'no', evidenceUrl: null };
}

function buildCountryDigitalEnablers(iso3) {
  return {
    dimensions: DIMENSIONS.map((dimension) => ({
      key: dimension.key,
      title: dimension.title,
      count: dimension.enablers.length,
      enablers: dimension.enablers.map((enabler) => {
        const mock = buildMockStatus(`${iso3}:${dimension.key}:${enabler.key}`);
        return {
          key: enabler.key,
          name: enabler.name,
          description: enabler.description,
          status: mock.status,
          evidenceUrl: mock.evidenceUrl,
        };
      }),
    })),
  };
}

module.exports = {
  buildCountryDigitalEnablers,
};
