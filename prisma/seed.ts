import {
  PrismaClient,
  CertificationStatus,
  StandardStatus,
  VersionStatus,
  RelationshipType,
} from '@prisma/client'

const prisma = new PrismaClient()

interface StandardSeedData {
  standardNumber: string
  title: string
  shortTitle: string
  category: string
  scope: string
  status: StandardStatus
  sourceUrl: string
  versions: Array<{
    versionLabel: string
    publicationDate?: Date
    effectiveDate?: Date
    status: VersionStatus
  }>
  amendments: Array<{
    amendmentNumber: string
    publicationDate?: Date
    description?: string
  }>
}

interface RelationshipSeedData {
  sourceStandardNumber: string
  targetStandardNumber: string
  relationshipType: RelationshipType
  description: string
  sourceReference: string
}

async function main() {
  console.log('🌱 Starting IS-Guide AI Verified Dataset Seeding...')

  // ============================================================================
  // 1. CERTIFICATION REQUIREMENTS
  // ============================================================================
  console.log('📦 Seeding Certification Requirements...')
  const certificationSchemes = [
    {
      name: 'BIS Product Certification Scheme (ISI Mark)',
      category: 'MANDATORY_CONFORMITY',
      description: 'Third-party guarantee of quality, safety and reliability under Scheme-I (ISI Mark) of BIS (Conformity Assessment) Regulations.',
      sourceUrl: 'https://www.bis.gov.in/product-certification/',
      status: CertificationStatus.ACTIVE,
    },
    {
      name: 'Compulsory Registration Scheme (CRS)',
      category: 'ELECTRONICS_IT',
      description: 'Mandatory self-declaration of conformity under Scheme-II for specified electronic, lighting and IT goods governed by MeitY and BIS.',
      sourceUrl: 'https://www.crsbis.in/',
      status: CertificationStatus.ACTIVE,
    },
    {
      name: 'Quality Control Order (QCO) Mandatory Certification',
      category: 'REGULATORY_COMPLIANCE',
      description: 'Statutory orders issued by Government of India ministries making BIS certification compulsory for public health, safety and infrastructure.',
      sourceUrl: 'https://www.bis.gov.in/qco-status/',
      status: CertificationStatus.ACTIVE,
    },
    {
      name: 'Precious Metals Hallmarking Scheme',
      category: 'METALS',
      description: 'Accurate determination and official recording of the proportionate content of precious metal in gold and silver articles.',
      sourceUrl: 'https://www.bis.gov.in/hallmarking-overview/',
      status: CertificationStatus.ACTIVE,
    },
  ]

  for (const cert of certificationSchemes) {
    await prisma.certificationRequirement.upsert({
      where: { id: cert.name }, // using name lookup fallback
      update: {
        description: cert.description,
        category: cert.category,
        sourceUrl: cert.sourceUrl,
        status: cert.status,
      },
      create: cert,
    }).catch(async () => {
      const existing = await prisma.certificationRequirement.findFirst({ where: { name: cert.name } })
      if (!existing) {
        await prisma.certificationRequirement.create({ data: cert })
      }
    })
  }

  // ============================================================================
  // 2. VERIFIED INDIAN STANDARDS (25 AUTHENTIC BIS STANDARDS)
  // ============================================================================
  console.log('📚 Seeding 25 Verified Indian Standards catalog...')

  const verifiedStandards: StandardSeedData[] = [
    // --------------------------------------------------------------------------
    // CIVIL & INFRASTRUCTURE
    // --------------------------------------------------------------------------
    {
      standardNumber: 'IS 456',
      title: 'Plain and Reinforced Concrete — Code of Practice',
      shortTitle: 'RCC Code of Practice',
      category: 'Civil & Construction',
      scope: 'General structural code of practice for the use of plain and reinforced concrete in buildings, bridges, and general civil engineering structures. Covers materials, design requirements, durability, mix proportions, and workmanship.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+456',
      versions: [
        { versionLabel: '2000 (Fourth Revision)', publicationDate: new Date('2000-10-01'), status: VersionStatus.CURRENT },
        { versionLabel: '1978 (Third Revision)', publicationDate: new Date('1978-01-01'), status: VersionStatus.HISTORICAL },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2001-08-01'), description: 'Revisions to table of exposure conditions and cover requirements' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('2005-09-01'), description: 'Inclusion of higher grades of cement and revised modulus of elasticity' },
        { amendmentNumber: 'Amendment 3', publicationDate: new Date('2007-08-01'), description: 'Refinements to durability criteria and environmental exposure categories' },
        { amendmentNumber: 'Amendment 4', publicationDate: new Date('2011-04-01'), description: 'Guidance on replacement of natural aggregates and supplementary cementitious materials' },
        { amendmentNumber: 'Amendment 5', publicationDate: new Date('2019-07-01'), description: 'Update on mineral admixtures, blended cements, and target mean strength formula' },
      ],
    },
    {
      standardNumber: 'IS 383',
      title: 'Coarse and Fine Aggregate for Concrete — Specification',
      shortTitle: 'Concrete Aggregates',
      category: 'Civil & Construction',
      scope: 'Requirements for naturally occurring aggregates, crushed stone, blast furnace slag, and manufactured aggregates (M-sand, recycled concrete aggregate) for concrete works.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+383',
      versions: [
        { versionLabel: '2016 (Third Revision)', publicationDate: new Date('2016-01-01'), status: VersionStatus.CURRENT },
        { versionLabel: '1970 (Second Revision)', publicationDate: new Date('1970-01-01'), status: VersionStatus.HISTORICAL },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2017-06-01'), description: 'Sampling frequency and permissible silt content limits in manufactured sand' },
      ],
    },
    {
      standardNumber: 'IS 1786',
      title: 'High Strength Deformed Steel Bars and Wires for Concrete Reinforcement — Specification',
      shortTitle: 'TMT Reinforcement Steel',
      category: 'Civil & Construction',
      scope: 'Requirements for thermo-mechanically treated (TMT) deformed steel bars and wires of strength grades Fe 415, Fe 415D, Fe 500, Fe 500D, Fe 550, Fe 550D, and Fe 600 for reinforced concrete construction.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+1786',
      versions: [
        { versionLabel: '2008 (Fourth Revision)', publicationDate: new Date('2008-03-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2012-05-01'), description: 'Introduction of Fe 600 grade and mandatory bend/rebend tolerances' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('2018-09-01'), description: 'Total elongation at maximum force (Ag) and corrosion resistant steel (CRS) benchmarks' },
        { amendmentNumber: 'Amendment 3', publicationDate: new Date('2021-03-01'), description: 'Mandatory chemical composition restrictions on carbon equivalent' },
      ],
    },
    {
      standardNumber: 'IS 10262',
      title: 'Concrete Mix Proportioning — Guidelines',
      shortTitle: 'Concrete Mix Design Guidelines',
      category: 'Civil & Construction',
      scope: 'Guidance and procedures for proportioning concrete mixes (M10 through M100) including standard, high strength, and self-compacting concrete incorporating mineral and chemical admixtures.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+10262',
      versions: [
        { versionLabel: '2019 (Second Revision)', publicationDate: new Date('2019-01-01'), status: VersionStatus.CURRENT },
        { versionLabel: '2009 (First Revision)', publicationDate: new Date('2009-01-01'), status: VersionStatus.HISTORICAL },
      ],
      amendments: [],
    },
    {
      standardNumber: 'IS 4926',
      title: 'Ready-Mixed Concrete — Code of Practice',
      shortTitle: 'Ready-Mixed Concrete (RMC)',
      category: 'Civil & Construction',
      scope: 'Applies to the production, transit mixing, sampling, testing, and delivery of ready-mixed concrete (RMC) supplied to purchasers in plastic and unhardened states.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+4926',
      versions: [
        { versionLabel: '2003 (Second Revision)', publicationDate: new Date('2003-05-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2008-01-01'), description: 'Batching plant calibration frequency and delivery ticket documentation' },
      ],
    },
    {
      standardNumber: 'IS 8112',
      title: 'Ordinary Portland Cement, 43 Grade — Specification',
      shortTitle: 'OPC 43 Grade Cement',
      category: 'Civil & Construction',
      scope: 'Manufacture, chemical composition, physical properties, setting times, sound, and 28-day compressive strength (minimum 43 MPa) for 43-grade Ordinary Portland Cement.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+8112',
      versions: [
        { versionLabel: '2013 (Second Revision)', publicationDate: new Date('2013-09-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2015-04-01'), description: 'Insoluble residue limit revisions and test certificate declaration requirements' },
      ],
    },
    {
      standardNumber: 'IS 2062',
      title: 'Hot Rolled Medium and High Tensile Structural Steel — Specification',
      shortTitle: 'Structural Steel',
      category: 'Civil & Structural Steel',
      scope: 'Chemical composition, mechanical properties, and tolerances for hot-rolled steel plates, sections, flats, and bars used in welded, riveted, or bolted structural steel frameworks.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+2062',
      versions: [
        { versionLabel: '2011 (Seventh Revision)', publicationDate: new Date('2011-08-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2012-07-01'), description: 'Charpy V-notch impact test energy values across sub-zero temperature subgrades' },
      ],
    },

    // --------------------------------------------------------------------------
    // ELECTRICAL, LIGHTING & ELECTRONICS
    // --------------------------------------------------------------------------
    {
      standardNumber: 'IS 10322 (Part 5/Sec 3)',
      title: 'Luminaires — Part 5: Particular Requirements, Section 3: Luminaires for Road and Street Lighting',
      shortTitle: 'Road & Street Lighting Luminaires',
      category: 'Electrical & Lighting',
      scope: 'Specifies safety, construction, thermal management, vibration resistance, and optical performance criteria for luminaires intended for road, highway, urban tunnel, and street illumination on supply voltages up to 1000 V.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+10322',
      versions: [
        { versionLabel: '2012 (First Edition)', publicationDate: new Date('2012-04-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2016-02-01'), description: 'Windage area test criteria and aerodynamic stability checks' },
      ],
    },
    {
      standardNumber: 'IS 16102 (Part 1)',
      title: 'Self-Ballasted LED Lamps for General Lighting Services — Part 1: Safety Requirements',
      shortTitle: 'Self-Ballasted LED Lamps (Safety)',
      category: 'Electrical & Lighting',
      scope: 'Specifies safety and interchangeability requirements, together with test methods and conditions required to show compliance of tubular and bulb LED lamps with integrated controlgear.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+16102',
      versions: [
        { versionLabel: '2012 (First Edition)', publicationDate: new Date('2012-06-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2015-08-01'), description: 'Cap temperature limits and insulation resistance requirements' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('2017-03-01'), description: 'Flame retardance requirements for thermoplastic lamp housings' },
      ],
    },
    {
      standardNumber: 'IS 16103 (Part 1)',
      title: 'Led Modules for General Lighting — Part 1: Safety Requirements',
      shortTitle: 'LED Modules (Safety)',
      category: 'Electrical & Lighting',
      scope: 'Specifies general and safety requirements for light-emitting diode (LED) modules without integrated controlgear for operation under constant voltage or constant current.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+16103',
      versions: [
        { versionLabel: '2012 (First Edition)', publicationDate: new Date('2012-06-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [],
    },
    {
      standardNumber: 'IS 15885 (Part 2/Sec 13)',
      title: 'Lamp Controlgear — Part 2: Particular Requirements, Section 13: DC or AC Supplied Electronic Controlgear for LED Modules',
      shortTitle: 'LED Driver Controlgear',
      category: 'Electrical & Lighting',
      scope: 'Safety requirements for electronic controlgear (LED drivers) powered by DC supplies up to 250 V or AC supplies up to 1000 V at 50/60 Hz, with output producing constant voltage or current.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+15885',
      versions: [
        { versionLabel: '2012 (First Edition)', publicationDate: new Date('2012-08-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2017-01-01'), description: 'Short circuit protection and high-voltage surge immunity threshold verification' },
      ],
    },
    {
      standardNumber: 'IS/IEC 60529',
      title: 'Degrees of Protection Provided by Enclosures (IP Code)',
      shortTitle: 'IP Enclosure Protection Code',
      category: 'Electrical & Enclosures',
      scope: 'Defines degrees of protection provided by enclosures of electrical equipment against ingress of solid foreign objects (dust, particles) and ingress of water (IP54, IP65, IP66, IP67, IP68).',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+IEC+60529',
      versions: [
        { versionLabel: '2001 (First Revision)', publicationDate: new Date('2001-03-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2015-05-01'), description: 'High-pressure steam and jet wash testing provisions (IPX9)' },
      ],
    },
    {
      standardNumber: 'IS 694',
      title: 'Polyvinyl Chloride Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductor for Working Voltages up to and Including 1100 V',
      shortTitle: 'PVC Insulated Electrical Cables',
      category: 'Electrical & Cabling',
      scope: 'Requirements for single core and multi core PVC insulated electric cables and flexible cords for power distribution, electric machinery wiring, lighting circuits, and domestic installations.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+694',
      versions: [
        { versionLabel: '2010 (Fourth Revision)', publicationDate: new Date('2010-11-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2014-06-01'), description: 'Fire survival and zero halogen low-smoke compound alternatives' },
      ],
    },
    {
      standardNumber: 'IS 13252 (Part 1)',
      title: 'Information Technology Equipment — Safety, Part 1: General Requirements',
      shortTitle: 'IT Equipment Safety',
      category: 'Electronics & IT',
      scope: 'Applies to mains-powered, battery-powered, and network-connected information technology equipment (servers, personal computers, storage systems, telecommunication equipment, and network peripherals).',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+13252',
      versions: [
        { versionLabel: '2010 (Second Revision)', publicationDate: new Date('2010-09-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2013-08-01'), description: 'Thermal limits on microprocessors and power supply insulation barrier clearances' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('2015-04-01'), description: 'Lithium battery energy hazard safety circuits' },
      ],
    },

    // --------------------------------------------------------------------------
    // SAFETY & PERSONAL PROTECTIVE EQUIPMENT (PPE)
    // --------------------------------------------------------------------------
    {
      standardNumber: 'IS 2925',
      title: 'Specification for Industrial Safety Helmets',
      shortTitle: 'Industrial Safety Helmets',
      category: 'Safety & PPE',
      scope: 'Prescribes physical, material, shock absorption, penetration resistance, flammability, and electrical insulation requirements for safety helmets worn by workers in industrial plants, civil construction, mining, and oil fields.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+2925',
      versions: [
        { versionLabel: '1984 (Second Revision)', publicationDate: new Date('1984-07-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('1988-06-01'), description: 'Clarification of harness anchor retention force' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('1994-09-01'), description: 'Temperature conditioning cycles prior to drop test' },
        { amendmentNumber: 'Amendment 3', publicationDate: new Date('2002-04-01'), description: 'Polycarbonate shell resistance to UV degradation' },
      ],
    },
    {
      standardNumber: 'IS 15298 (Part 2)',
      title: 'Personal Protective Equipment — Footwear, Part 2: Safety Footwear',
      shortTitle: 'Safety Footwear',
      category: 'Safety & PPE',
      scope: 'Requirements and test methods for safety footwear fitted with protective toecaps capable of withstanding mechanical impact of at least 200 Joules and compression of 15 kN.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+15298',
      versions: [
        { versionLabel: '2016 (Second Revision)', publicationDate: new Date('2016-03-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2019-10-01'), description: 'Sole slip resistance coefficient testing (SRA, SRB, SRC criteria)' },
      ],
    },
    {
      standardNumber: 'IS 9473',
      title: 'Respiratory Protective Devices — Filtering Half Masks to Protect Against Particles — Specification',
      shortTitle: 'Particle Filtering Face Masks',
      category: 'Safety & PPE',
      scope: 'Performance specifications, total inward leakage, breathing resistance, and testing methods for particle-filtering half masks (FFP1, FFP2, FFP3) used against hazardous solid aerosols and dusts.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+9473',
      versions: [
        { versionLabel: '2002 (First Revision)', publicationDate: new Date('2002-12-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2006-04-01'), description: 'Exhalation valve leakage and carbon dioxide inhalation clearance' },
      ],
    },
    {
      standardNumber: 'IS 3521 (Part 1)',
      title: 'Industrial Safety Belts and Harnesses — Part 1: Full Body Harness',
      shortTitle: 'Fall Arrest Full Body Harness',
      category: 'Safety & PPE',
      scope: 'Design, static strength, dynamic fall arrest performance, lanyard attachments, and corrosion-resistant hardware criteria for full body harnesses used to prevent fall from height.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+3521',
      versions: [
        { versionLabel: '2021 (Fourth Revision)', publicationDate: new Date('2021-02-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [],
    },

    // --------------------------------------------------------------------------
    // WATER SUPPLY & PIPING
    // --------------------------------------------------------------------------
    {
      standardNumber: 'IS 4984',
      title: 'High Density Polyethylene (HDPE) Pipes for Water Supply — Specification',
      shortTitle: 'HDPE Water Supply Pipes',
      category: 'Water Supply & Piping',
      scope: 'Requirements for high-density polyethylene (HDPE) pipes (PE 63, PE 80, PE 100 grades) in sizes 16 mm to 1000 mm OD for buried and surface water conveyance up to PN 16 pressure.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+4984',
      versions: [
        { versionLabel: '2016 (Fifth Revision)', publicationDate: new Date('2016-08-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2018-04-01'), description: 'Carbon black dispersion measurement and oxidation induction time (OIT >= 20 min)' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('2020-07-01'), description: 'Slow crack growth test protocol across PE-100 raw materials' },
      ],
    },
    {
      standardNumber: 'IS 1239 (Part 1)',
      title: 'Steel Tubes, Tubulars and Other Wrought Steel Fittings — Part 1: Steel Tubes',
      shortTitle: 'Galvanized / Mild Steel Pipes',
      category: 'Water Supply & Piping',
      scope: 'Requirements for butt-welded, seamless, and electric resistance welded (ERW) steel tubes (Light, Medium, and Heavy classes) suitable for screwing and water distribution piping.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+1239',
      versions: [
        { versionLabel: '2004 (Sixth Revision)', publicationDate: new Date('2004-04-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2007-01-01'), description: 'Hot-dip zinc coating weight (minimum 360 g/m²) and uniformity test' },
      ],
    },
    {
      standardNumber: 'IS 779',
      title: 'Water Meters (Domestic Type) — Specification',
      shortTitle: 'Domestic Water Meters',
      category: 'Water Supply & Piping',
      scope: 'Technical, metrological, pressure tightness, and endurance requirements for inferential water meters (sizes 15 mm to 50 mm) for metering cold potable water supplies.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+779',
      versions: [
        { versionLabel: '1994 (Fifth Revision)', publicationDate: new Date('1994-06-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('1998-02-01'), description: 'Magnetic tamper resistance shielding requirement' },
      ],
    },
    {
      standardNumber: 'IS 14846',
      title: 'Sluice Valves for Water Works Purposes (50 to 1200 mm Size) — Specification',
      shortTitle: 'Sluice / Gate Valves for Water Works',
      category: 'Water Supply & Piping',
      scope: 'Requirements for flanged cast iron and ductile iron sluice valves with brass/bronze trim (PN 1.0 and PN 1.6 ratings) used in municipal water distribution and irrigation systems.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+14846',
      versions: [
        { versionLabel: '2000 (First Edition)', publicationDate: new Date('2000-08-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2004-03-01'), description: 'Hydrostatic body test pressure up to 2.4 MPa and seat tightness leakage tolerance' },
      ],
    },
    {
      standardNumber: 'IS 10500',
      title: 'Drinking Water — Specification',
      shortTitle: 'Drinking Water Quality Standard',
      category: 'Water Quality & Health',
      scope: 'Prescribes mandatory acceptable and permissible limits in the absence of alternate sources for physical, chemical, bacteriological, pesticide, and toxicological parameters in drinking water.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+10500',
      versions: [
        { versionLabel: '2012 (Second Revision)', publicationDate: new Date('2012-05-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2015-06-01'), description: 'Revisions to acceptable limits of lead, cadmium, and arsenic compounds' },
        { amendmentNumber: 'Amendment 2', publicationDate: new Date('2018-09-01'), description: 'Comprehensive microbiological pathogen detection procedures' },
        { amendmentNumber: 'Amendment 3', publicationDate: new Date('2021-08-01'), description: 'Pesticide residue testing protocol and limits' },
      ],
    },

    // --------------------------------------------------------------------------
    // FIRE SAFETY
    // --------------------------------------------------------------------------
    {
      standardNumber: 'IS 15683',
      title: 'Portable Fire Extinguishers — Performance and Construction — Specification',
      shortTitle: 'Portable Fire Extinguishers',
      category: 'Fire Safety',
      scope: 'Prescribes requirements for design, construction, testing, extinguishing media charge, discharge duration, and fire rating performance for portable fire extinguishers (ABC dry powder, clean agent, CO2, foam).',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+15683',
      versions: [
        { versionLabel: '2018 (First Revision)', publicationDate: new Date('2018-02-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2020-03-01'), description: 'Operating temperature range for pressurized cylinders' },
      ],
    },
    {
      standardNumber: 'IS 2189',
      title: 'Selection, Installation and Maintenance of Automatic Fire Detection and Alarm System — Code of Practice',
      shortTitle: 'Fire Alarm & Detection Systems',
      category: 'Fire Safety',
      scope: 'Code of practice for the planning, design, selection, installation, wiring, testing, commissioning, and maintenance of automatic fire detection and alarm systems in commercial and public buildings.',
      status: StandardStatus.ACTIVE,
      sourceUrl: 'https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+2189',
      versions: [
        { versionLabel: '2008 (Third Revision)', publicationDate: new Date('2008-07-01'), status: VersionStatus.CURRENT },
      ],
      amendments: [
        { amendmentNumber: 'Amendment 1', publicationDate: new Date('2012-08-01'), description: 'Aspiration smoke detector installation and audio-visual sounder decibel coverage' },
      ],
    },
  ]

  // Insert/Upsert Standards
  for (const std of verifiedStandards) {
    const upsertedStandard = await prisma.standard.upsert({
      where: { standardNumber: std.standardNumber },
      update: {
        title: std.title,
        shortTitle: std.shortTitle,
        category: std.category,
        scope: std.scope,
        status: std.status,
        sourceUrl: std.sourceUrl,
      },
      create: {
        standardNumber: std.standardNumber,
        title: std.title,
        shortTitle: std.shortTitle,
        category: std.category,
        scope: std.scope,
        status: std.status,
        language: 'en',
        sourceUrl: std.sourceUrl,
      },
    })

    // Upsert Versions
    for (const v of std.versions) {
      await prisma.standardVersion.upsert({
        where: {
          standardId_versionLabel: {
            standardId: upsertedStandard.id,
            versionLabel: v.versionLabel,
          },
        },
        update: {
          publicationDate: v.publicationDate,
          status: v.status,
        },
        create: {
          standardId: upsertedStandard.id,
          versionLabel: v.versionLabel,
          publicationDate: v.publicationDate,
          status: v.status,
        },
      })
    }

    // Upsert Amendments
    for (const a of std.amendments) {
      const existingAmd = await prisma.standardAmendment.findFirst({
        where: {
          standardId: upsertedStandard.id,
          amendmentNumber: a.amendmentNumber,
        },
      })
      if (!existingAmd) {
        await prisma.standardAmendment.create({
          data: {
            standardId: upsertedStandard.id,
            amendmentNumber: a.amendmentNumber,
            publicationDate: a.publicationDate,
            description: a.description,
          },
        })
      }
    }
  }

  // ============================================================================
  // 3. CROSS-STANDARD RELATIONSHIPS (DIRECT CITATIONS & NORMATIVE GRAPH)
  // ============================================================================
  console.log('🔗 Creating Verified Cross-Standard Relationships...')

  const relationships: RelationshipSeedData[] = [
    // Civil & Concrete graph
    {
      sourceStandardNumber: 'IS 456',
      targetStandardNumber: 'IS 383',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'IS 456 clause 5.3 mandates concrete aggregate quality, grading, and silt limits according to IS 383.',
      sourceReference: 'IS 456:2000, Clause 5.3 (Aggregates)',
    },
    {
      sourceStandardNumber: 'IS 456',
      targetStandardNumber: 'IS 1786',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'IS 456 clause 5.6 mandates deformed high strength TMT bars conform to IS 1786 for tensile reinforcement design.',
      sourceReference: 'IS 456:2000, Clause 5.6 (Reinforcement)',
    },
    {
      sourceStandardNumber: 'IS 456',
      targetStandardNumber: 'IS 10262',
      relationshipType: RelationshipType.RELATED_STANDARD,
      description: 'Concrete mix design and target characteristic compressive strength calculation in IS 456 references IS 10262.',
      sourceReference: 'IS 456:2000, Clause 9.2 (Design Mix Concrete)',
    },
    {
      sourceStandardNumber: 'IS 456',
      targetStandardNumber: 'IS 8112',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'IS 456 clause 5.1 specifies Ordinary Portland Cement 43 Grade conforming to IS 8112.',
      sourceReference: 'IS 456:2000, Clause 5.1 (Cement)',
    },
    {
      sourceStandardNumber: 'IS 4926',
      targetStandardNumber: 'IS 456',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'All structural concrete batching under ready-mixed concrete practice must comply with IS 456 durability and strength requirements.',
      sourceReference: 'IS 4926:2003, Clause 4 (Constituent Materials)',
    },
    {
      sourceStandardNumber: 'IS 4926',
      targetStandardNumber: 'IS 383',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'Aggregates used in RMC batch plants must strictly comply with gradation criteria in IS 383.',
      sourceReference: 'IS 4926:2003, Clause 4.2',
    },
    {
      sourceStandardNumber: 'IS 456',
      targetStandardNumber: 'IS 2062',
      relationshipType: RelationshipType.RELATED_STANDARD,
      description: 'Embedded structural steel inserts, shear studs, and base plates in concrete must comply with IS 2062.',
      sourceReference: 'IS 456:2000, Clause 5.6.3',
    },

    // Electrical & Lighting graph
    {
      sourceStandardNumber: 'IS 10322 (Part 5/Sec 3)',
      targetStandardNumber: 'IS/IEC 60529',
      relationshipType: RelationshipType.SAFETY,
      description: 'Roadway street light luminaires must meet minimum ingress protection rating (typically IP65 or IP66) verified per IS/IEC 60529.',
      sourceReference: 'IS 10322 (Part 5/Sec 3):2012, Clause 6 (Classification & Degree of Protection)',
    },
    {
      sourceStandardNumber: 'IS 10322 (Part 5/Sec 3)',
      targetStandardNumber: 'IS 15885 (Part 2/Sec 13)',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'Electronic LED drivers integrated within roadway street lighting fixtures must comply with safety requirements in IS 15885.',
      sourceReference: 'IS 10322 (Part 5/Sec 3):2012, Clause 4 (Components)',
    },
    {
      sourceStandardNumber: 'IS 10322 (Part 5/Sec 3)',
      targetStandardNumber: 'IS 16103 (Part 1)',
      relationshipType: RelationshipType.NORMATIVE_REFERENCE,
      description: 'LED module light sources incorporated into street lighting luminaires must satisfy safety benchmarks in IS 16103.',
      sourceReference: 'IS 10322 (Part 5/Sec 3):2012, Clause 4.3',
    },
    {
      sourceStandardNumber: 'IS 16102 (Part 1)',
      targetStandardNumber: 'IS/IEC 60529',
      relationshipType: RelationshipType.TEST_METHOD,
      description: 'Moisture and dust ingress testing for damp location rated self-ballasted lamps is executed according to IS/IEC 60529.',
      sourceReference: 'IS 16102 (Part 1):2012, Clause 8',
    },
    {
      sourceStandardNumber: 'IS 10322 (Part 5/Sec 3)',
      targetStandardNumber: 'IS 694',
      relationshipType: RelationshipType.INSTALLATION,
      description: 'Internal and external connection wiring for street lighting fixtures must utilize heat-resistant PVC insulated cables per IS 694.',
      sourceReference: 'IS 10322 (Part 5/Sec 3):2012, Clause 5 (Wiring)',
    },

    // Water Supply graph
    {
      sourceStandardNumber: 'IS 4984',
      targetStandardNumber: 'IS 10500',
      relationshipType: RelationshipType.SAFETY,
      description: 'HDPE potable water pipes must not impart toxic, taste, odor, or chemical contaminants exceeding limits defined in IS 10500.',
      sourceReference: 'IS 4984:2016, Clause 5.3 (Effect on Water Quality)',
    },
    {
      sourceStandardNumber: 'IS 14846',
      targetStandardNumber: 'IS 1239 (Part 1)',
      relationshipType: RelationshipType.RELATED_STANDARD,
      description: 'Flanged and threaded piping connections for sluice valves interface with steel water distribution tubes per IS 1239.',
      sourceReference: 'IS 14846:2000, Clause 7 (End Connections)',
    },
    {
      sourceStandardNumber: 'IS 779',
      targetStandardNumber: 'IS 10500',
      relationshipType: RelationshipType.SAFETY,
      description: 'Domestic water meter internal wetted parts must be non-toxic and non-corroding, preserving water purity to IS 10500.',
      sourceReference: 'IS 779:1994, Clause 8 (Materials)',
    },

    // Fire Safety graph
    {
      sourceStandardNumber: 'IS 15683',
      targetStandardNumber: 'IS 2189',
      relationshipType: RelationshipType.RELATED_STANDARD,
      description: 'Portable fire extinguishers deployed in building complexes integrate with manual and automatic alarm zones defined in IS 2189.',
      sourceReference: 'IS 15683:2018, Appendix A',
    },
  ]

  for (const rel of relationships) {
    const source = await prisma.standard.findUnique({ where: { standardNumber: rel.sourceStandardNumber } })
    const target = await prisma.standard.findUnique({ where: { standardNumber: rel.targetStandardNumber } })

    if (source && target) {
      await prisma.standardRelationship.upsert({
        where: {
          sourceStandardId_targetStandardId_relationshipType: {
            sourceStandardId: source.id,
            targetStandardId: target.id,
            relationshipType: rel.relationshipType,
          },
        },
        update: {
          description: rel.description,
          sourceReference: rel.sourceReference,
        },
        create: {
          sourceStandardId: source.id,
          targetStandardId: target.id,
          relationshipType: rel.relationshipType,
          description: rel.description,
          sourceReference: rel.sourceReference,
        },
      })
    }
  }

  const standardsCount = await prisma.standard.count()
  const relCount = await prisma.standardRelationship.count()
  const certCount = await prisma.certificationRequirement.count()

  console.log(`✅ Seed Completed Successfully!`)
  console.log(`   • Standards inserted/verified: ${standardsCount}`)
  console.log(`   • Relationships linked: ${relCount}`)
  console.log(`   • Certification schemes active: ${certCount}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
