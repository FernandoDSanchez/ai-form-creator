import { Type, type Static } from '@sinclair/typebox';

import { formFieldComponents } from './form-field-component.js';

/**
 * Vocabulario cerrado de campos que un formulario puede tener.
 *
 * Es la pieza que vuelve verificable lo que genera la IA. Sin esta lista, el
 * modelo inventaría `nombre_empresa`, `razonSocial` y `companyName` para lo
 * mismo, y ningún consumidor podría leer dos formularios con el mismo código.
 * Con ella, el `name` de cada campo del JSON de Formily sale de un enum: lo
 * valida el structured output y lo vuelve a validar el workflow.
 *
 * Agregar un campo es agregar una fila acá **y** su entrada en
 * `formFieldCatalog`, que es un `Record` sobre este mismo tipo: si falta la
 * descripción, no compila. Esa descripción no es documentación decorativa —
 * viaja en el prompt y es lo único que el modelo tiene para elegir bien.
 */

/** Núcleo transversal: sirve para cualquier documento regulatorio. */
const complianceFieldNames = {
  entityLegalName: 'entityLegalName',
  entityTaxId: 'entityTaxId',
  entityCountry: 'entityCountry',
  economicActivity: 'economicActivity',
  contactPersonName: 'contactPersonName',
  contactEmail: 'contactEmail',
  regulationReference: 'regulationReference',
  obligationDescription: 'obligationDescription',
  controlDescription: 'controlDescription',
  riskLevel: 'riskLevel',
  complianceStatus: 'complianceStatus',
  evidenceDescription: 'evidenceDescription',
  responsibleParty: 'responsibleParty',
  assessmentDate: 'assessmentDate',
  effectiveDate: 'effectiveDate',
  expirationDate: 'expirationDate',
  observations: 'observations',
  declarationAccepted: 'declarationAccepted',
} as const;

/** Aduana y comercio exterior: el dominio del dataset que hoy está cargado. */
const customsFieldNames = {
  importerTaxId: 'importerTaxId',
  exporterName: 'exporterName',
  customsRegime: 'customsRegime',
  hsTariffCode: 'hsTariffCode',
  merchandiseDescription: 'merchandiseDescription',
  originCountry: 'originCountry',
  portOfEntry: 'portOfEntry',
  transportMode: 'transportMode',
  billOfLadingNumber: 'billOfLadingNumber',
  customsDeclarationNumber: 'customsDeclarationNumber',
  declaredValue: 'declaredValue',
  currencyCode: 'currencyCode',
  grossWeightKg: 'grossWeightKg',
  packageCount: 'packageCount',
  arrivalDate: 'arrivalDate',
  dutiesPaid: 'dutiesPaid',
} as const;

export const formFieldNames = {
  ...complianceFieldNames,
  ...customsFieldNames,
} as const;

export const formFieldNameSchema = /* @__PURE__ */ Type.Enum(formFieldNames, {
  $id: 'FormFieldName',
  description:
    'Identificador del campo. Sólo se admiten los de esta lista cerrada.',
});

export type FormFieldName = Static<typeof formFieldNameSchema>;

/** Los dos bloques del vocabulario, para agrupar en el prompt y en la UI. */
export const formFieldGroups = {
  compliance: 'compliance',
  customs: 'customs',
} as const;

export type FormFieldGroup =
  (typeof formFieldGroups)[keyof typeof formFieldGroups];

export type FormFieldDefinition = {
  /** Título por defecto, en español, si el modelo no propone uno mejor. */
  label: string;
  /** Qué significa el campo. Es lo que lee el modelo para elegir. */
  description: string;
  /** Componente natural del campo; el modelo puede apartarse con motivo. */
  component: (typeof formFieldComponents)[keyof typeof formFieldComponents];
  group: FormFieldGroup;
};

/**
 * Diccionario del vocabulario. `Record<FormFieldName, …>` a propósito: un campo
 * nuevo en el enum rompe la compilación acá hasta que alguien lo describa.
 */
export const formFieldCatalog: Record<FormFieldName, FormFieldDefinition> = {
  // --- núcleo de cumplimiento ---
  [formFieldNames.entityLegalName]: {
    label: 'Razón social',
    description: 'Nombre legal completo del sujeto obligado.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.entityTaxId]: {
    label: 'Identificación tributaria',
    description:
      'Número de identificación fiscal del sujeto obligado (RIF, RUC, NIT).',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.entityCountry]: {
    label: 'País de constitución',
    description: 'País donde está constituida legalmente la entidad.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.economicActivity]: {
    label: 'Actividad económica',
    description: 'Actividad económica principal declarada por la entidad.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.contactPersonName]: {
    label: 'Responsable de cumplimiento',
    description: 'Persona designada como contacto para el trámite.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.contactEmail]: {
    label: 'Correo de contacto',
    description: 'Correo electrónico al que se notifican las observaciones.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.regulationReference]: {
    label: 'Norma aplicable',
    description:
      'Referencia a la norma, resolución o artículo que origina la obligación.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.obligationDescription]: {
    label: 'Obligación',
    description: 'Descripción de la obligación regulatoria que se atiende.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.controlDescription]: {
    label: 'Control implementado',
    description:
      'Control, procedimiento o medida con la que se atiende la obligación.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.riskLevel]: {
    label: 'Nivel de riesgo',
    description:
      'Riesgo asociado, en una escala cerrada (por ejemplo bajo, medio, alto).',
    component: formFieldComponents.radioGroup,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.complianceStatus]: {
    label: 'Estado de cumplimiento',
    description:
      'Grado de cumplimiento declarado (cumple, cumple parcialmente, no cumple).',
    component: formFieldComponents.select,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.evidenceDescription]: {
    label: 'Evidencia',
    description: 'Documentos o registros que respaldan lo declarado.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.responsibleParty]: {
    label: 'Área responsable',
    description: 'Unidad o cargo responsable de sostener el control.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.assessmentDate]: {
    label: 'Fecha de evaluación',
    description: 'Fecha en que se evaluó el cumplimiento.',
    component: formFieldComponents.date,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.effectiveDate]: {
    label: 'Vigente desde',
    description: 'Fecha desde la que rige lo declarado.',
    component: formFieldComponents.date,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.expirationDate]: {
    label: 'Vence el',
    description: 'Fecha en que caduca la vigencia o el permiso.',
    component: formFieldComponents.date,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.observations]: {
    label: 'Observaciones',
    description: 'Comentarios libres del declarante.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.declarationAccepted]: {
    label: 'Declaración jurada',
    description:
      'Confirmación de que lo declarado es cierto y de que se conocen las sanciones.',
    component: formFieldComponents.checkbox,
    group: formFieldGroups.compliance,
  },

  // --- aduana y comercio exterior ---
  [formFieldNames.importerTaxId]: {
    label: 'Identificación del importador',
    description: 'Número fiscal del importador registrado ante la aduana.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.exporterName]: {
    label: 'Exportador',
    description: 'Nombre o razón social del exportador en el país de origen.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.customsRegime]: {
    label: 'Régimen aduanero',
    description:
      'Régimen bajo el que se declara la mercancía (importación definitiva, admisión temporal, tránsito…).',
    component: formFieldComponents.select,
    group: formFieldGroups.customs,
  },
  [formFieldNames.hsTariffCode]: {
    label: 'Código arancelario',
    description:
      'Partida arancelaria del Sistema Armonizado que clasifica la mercancía.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.merchandiseDescription]: {
    label: 'Descripción de la mercancía',
    description: 'Detalle comercial de lo que se declara.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.customs,
  },
  [formFieldNames.originCountry]: {
    label: 'País de origen',
    description: 'País donde se produjo o manufacturó la mercancía.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.portOfEntry]: {
    label: 'Aduana de ingreso',
    description: 'Puerto, aeropuerto o aduana por donde entra la mercancía.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.transportMode]: {
    label: 'Modo de transporte',
    description: 'Vía por la que llega la carga (marítima, aérea, terrestre).',
    component: formFieldComponents.select,
    group: formFieldGroups.customs,
  },
  [formFieldNames.billOfLadingNumber]: {
    label: 'Conocimiento de embarque',
    description: 'Número del BL, guía aérea o carta de porte.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.customsDeclarationNumber]: {
    label: 'Número de declaración',
    description: 'Número de la declaración aduanera asociada.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.declaredValue]: {
    label: 'Valor declarado',
    description: 'Valor en aduana de la mercancía, en la moneda declarada.',
    component: formFieldComponents.number,
    group: formFieldGroups.customs,
  },
  [formFieldNames.currencyCode]: {
    label: 'Moneda',
    description: 'Moneda del valor declarado, en código ISO 4217.',
    component: formFieldComponents.select,
    group: formFieldGroups.customs,
  },
  [formFieldNames.grossWeightKg]: {
    label: 'Peso bruto (kg)',
    description: 'Peso bruto total de la carga en kilogramos.',
    component: formFieldComponents.number,
    group: formFieldGroups.customs,
  },
  [formFieldNames.packageCount]: {
    label: 'Cantidad de bultos',
    description: 'Número de bultos, cajas o contenedores declarados.',
    component: formFieldComponents.number,
    group: formFieldGroups.customs,
  },
  [formFieldNames.arrivalDate]: {
    label: 'Fecha de arribo',
    description: 'Fecha de llegada de la carga a la aduana de ingreso.',
    component: formFieldComponents.date,
    group: formFieldGroups.customs,
  },
  [formFieldNames.dutiesPaid]: {
    label: 'Tributos cancelados',
    description: 'Confirmación de que se pagaron los tributos aduaneros.',
    component: formFieldComponents.checkbox,
    group: formFieldGroups.customs,
  },
};
