import type { DocumentList } from "../types/index.js";
import { DocumentRegistryRepository } from "../kb/DocumentRegistryRepository.js";
import { KnowledgeBaseRepository } from "../kb/KnowledgeBaseRepository.js";

// ─── Result Type ──────────────────────────────────────────────────────────────

export type DocumentServiceResult =
  | { type: "found"; documentList: DocumentList }
  | { type: "not_found"; message: string; portalUrl?: string };

// ─── Service ──────────────────────────────────────────────────────────────────

export class DocumentRegistryService {
  private readonly docRepo: DocumentRegistryRepository;
  private readonly kbRepo: KnowledgeBaseRepository;

  constructor(
    docRepo: DocumentRegistryRepository = new DocumentRegistryRepository(),
    kbRepo: KnowledgeBaseRepository = new KnowledgeBaseRepository(),
  ) {
    this.docRepo = docRepo;
    this.kbRepo = kbRepo;
  }

  getDocuments(serviceOrSchemeId: string): DocumentServiceResult {
    const documentList = this.docRepo.getDocumentList(serviceOrSchemeId);

    if (documentList !== null) {
      return { type: "found", documentList };
    }

    const service = this.kbRepo.findServiceById(serviceOrSchemeId);
    if (service) {
      return { type: "not_found", message: `Document information for "${service.name}" is currently unavailable. Please visit the official portal for details.`, portalUrl: service.officialPortalUrl };
    }

    const scheme = this.kbRepo.findSchemeById(serviceOrSchemeId);
    if (scheme) {
      return { type: "not_found", message: `Document information for "${scheme.name}" is currently unavailable. Please visit the official portal for details.`, portalUrl: scheme.officialPortalUrl };
    }

    return { type: "not_found", message: `No document information found for the requested service or scheme ID "${serviceOrSchemeId}".` };
  }
}
