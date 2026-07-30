import { Type, type Static } from '@sinclair/typebox';

import { formFieldComponents } from './form-field-component.js';

/**
 * Closed vocabulary of fields a form may have.
 *
 * This is the piece that makes what the AI generates verifiable. Without this
 * list the model would invent `company_name`, `legalName` and `companyName` for
 * the same thing, and no consumer could read two forms with the same code. With
 * it, the `name` of every field of the Formily JSON comes from an enum: the
 * structured output validates it and the workflow validates it again.
 *
 * Adding a field means adding a row here **and** its entry in
 * `formFieldCatalog`, which is a `Record` over this very type: if the
 * description is missing, it does not compile. That description is not
 * decorative documentation — it travels in the prompt and is the only thing the
 * model has to choose well.
 */

/** Cross-cutting core: useful for any regulatory document. */
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

/** Customs and foreign trade: the domain of the dataset loaded today. */
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
    'Identifier of the field. Only the ones in this closed list are accepted.',
});

export type FormFieldName = Static<typeof formFieldNameSchema>;

/** The two blocks of the vocabulary, for grouping in the prompt and in the UI. */
export const formFieldGroups = {
  compliance: 'compliance',
  customs: 'customs',
} as const;

export type FormFieldGroup =
  (typeof formFieldGroups)[keyof typeof formFieldGroups];

export type FormFieldDefinition = {
  /** Default title, if the model does not propose a better one. */
  label: string;
  /** What the field means. This is what the model reads to choose. */
  description: string;
  /** Natural component for the field; the model may deviate with reason. */
  component: (typeof formFieldComponents)[keyof typeof formFieldComponents];
  group: FormFieldGroup;
};

/**
 * Dictionary of the vocabulary. `Record<FormFieldName, …>` on purpose: a new
 * field in the enum breaks compilation here until somebody describes it.
 */
export const formFieldCatalog: Record<FormFieldName, FormFieldDefinition> = {
  // --- compliance core ---
  [formFieldNames.entityLegalName]: {
    label: 'Legal name',
    description: 'Full legal name of the regulated entity.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.entityTaxId]: {
    label: 'Tax identification',
    description: 'Tax identification number of the regulated entity.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.entityCountry]: {
    label: 'Country of incorporation',
    description: 'Country where the entity is legally incorporated.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.economicActivity]: {
    label: 'Economic activity',
    description: 'Main economic activity declared by the entity.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.contactPersonName]: {
    label: 'Compliance officer',
    description: 'Person designated as the contact for the filing.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.contactEmail]: {
    label: 'Contact email',
    description: 'Email address where findings are notified.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.regulationReference]: {
    label: 'Applicable regulation',
    description:
      'Reference to the regulation, resolution or article the obligation comes from.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.obligationDescription]: {
    label: 'Obligation',
    description: 'Description of the regulatory obligation being addressed.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.controlDescription]: {
    label: 'Implemented control',
    description: 'Control, procedure or measure used to meet the obligation.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.riskLevel]: {
    label: 'Risk level',
    description:
      'Associated risk, on a closed scale (for example low, medium, high).',
    component: formFieldComponents.radioGroup,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.complianceStatus]: {
    label: 'Compliance status',
    description:
      'Declared degree of compliance (compliant, partially compliant, non-compliant).',
    component: formFieldComponents.select,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.evidenceDescription]: {
    label: 'Evidence',
    description: 'Documents or records backing what is declared.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.responsibleParty]: {
    label: 'Responsible area',
    description: 'Unit or role responsible for sustaining the control.',
    component: formFieldComponents.text,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.assessmentDate]: {
    label: 'Assessment date',
    description: 'Date on which compliance was assessed.',
    component: formFieldComponents.date,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.effectiveDate]: {
    label: 'Effective from',
    description: 'Date from which the declaration is in force.',
    component: formFieldComponents.date,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.expirationDate]: {
    label: 'Expires on',
    description: 'Date on which the validity or the permit expires.',
    component: formFieldComponents.date,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.observations]: {
    label: 'Observations',
    description: 'Free-form comments from the filer.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.compliance,
  },
  [formFieldNames.declarationAccepted]: {
    label: 'Sworn declaration',
    description:
      'Confirmation that the declaration is true and that the penalties are known.',
    component: formFieldComponents.checkbox,
    group: formFieldGroups.compliance,
  },

  // --- customs and foreign trade ---
  [formFieldNames.importerTaxId]: {
    label: 'Importer identification',
    description: 'Tax number of the importer registered with customs.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.exporterName]: {
    label: 'Exporter',
    description: 'Name or legal name of the exporter in the country of origin.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.customsRegime]: {
    label: 'Customs regime',
    description:
      'Regime the goods are declared under (definitive import, temporary admission, transit…).',
    component: formFieldComponents.select,
    group: formFieldGroups.customs,
  },
  [formFieldNames.hsTariffCode]: {
    label: 'Tariff code',
    description: 'Harmonized System tariff heading that classifies the goods.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.merchandiseDescription]: {
    label: 'Description of the goods',
    description: 'Commercial detail of what is being declared.',
    component: formFieldComponents.textarea,
    group: formFieldGroups.customs,
  },
  [formFieldNames.originCountry]: {
    label: 'Country of origin',
    description: 'Country where the goods were produced or manufactured.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.portOfEntry]: {
    label: 'Port of entry',
    description: 'Port, airport or customs office the goods come in through.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.transportMode]: {
    label: 'Mode of transport',
    description: 'Way the cargo arrives (sea, air, land).',
    component: formFieldComponents.select,
    group: formFieldGroups.customs,
  },
  [formFieldNames.billOfLadingNumber]: {
    label: 'Bill of lading',
    description: 'Number of the BL, air waybill or consignment note.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.customsDeclarationNumber]: {
    label: 'Declaration number',
    description: 'Number of the associated customs declaration.',
    component: formFieldComponents.text,
    group: formFieldGroups.customs,
  },
  [formFieldNames.declaredValue]: {
    label: 'Declared value',
    description: 'Customs value of the goods, in the declared currency.',
    component: formFieldComponents.number,
    group: formFieldGroups.customs,
  },
  [formFieldNames.currencyCode]: {
    label: 'Currency',
    description: 'Currency of the declared value, as an ISO 4217 code.',
    component: formFieldComponents.select,
    group: formFieldGroups.customs,
  },
  [formFieldNames.grossWeightKg]: {
    label: 'Gross weight (kg)',
    description: 'Total gross weight of the cargo in kilograms.',
    component: formFieldComponents.number,
    group: formFieldGroups.customs,
  },
  [formFieldNames.packageCount]: {
    label: 'Number of packages',
    description: 'Number of packages, boxes or containers declared.',
    component: formFieldComponents.number,
    group: formFieldGroups.customs,
  },
  [formFieldNames.arrivalDate]: {
    label: 'Arrival date',
    description: 'Date the cargo arrives at the port of entry.',
    component: formFieldComponents.date,
    group: formFieldGroups.customs,
  },
  [formFieldNames.dutiesPaid]: {
    label: 'Duties paid',
    description: 'Confirmation that customs duties have been paid.',
    component: formFieldComponents.checkbox,
    group: formFieldGroups.customs,
  },
};
