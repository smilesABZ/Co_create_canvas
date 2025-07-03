# Standardized Project Context Management Protocol (Project Briefcase)

## 1. Introduction & Purpose

The "Project Briefcase" is a curated set of documents designed to maintain a persistent and evolving context for any given project. Its primary purpose is to:

*   **Ensure Continuity:** Provide a shared understanding of the project's vision, progress, and interaction models, especially across different development sessions or when working with AI assistants that may have limited conversational memory.
*   **Facilitate AI Collaboration:** Equip AI assistants with the necessary background information to engage in deep, co-creative discussions, offer relevant suggestions, and contribute effectively to the project.
*   **Track Evolution:** Serve as a living record of the project's journey, key decisions, and future aspirations.

This protocol outlines how to manage and utilize the briefcase contents effectively.

## 2. Briefcase Contents

The briefcase, typically located in a `briefcase/` directory (or a similarly named project-specific context directory), generally contains the following key files:

*   **`README.md`**:
    *   **Role:** Provides an overview of the briefcase system itself – its purpose, contents, and a summary of this usage protocol. This is the entry point to understanding how the briefcase is structured and used for the specific project.
*   **`STRATEGIC_OVERVIEW.md`** (or similar, e.g., `PROJECT_VISION.md`, `CONCEPT_DOCUMENT.md`):
    *   **Role:** Contains the strategic, long-term vision for the project. It details the core architecture (if applicable), key implemented features or components, planned or potential future developments, and the guiding philosophies or objectives of the project.
*   **`ACTIVITY_LOG.md`** (or similar, e.g., `PROGRESS_JOURNAL.md`, `DEVELOPMENT_STATUS.md`):
    *   **Role:** Acts as a dynamic, operational journal of the project's progress. It typically includes the last major milestone achieved, the current development focus or area of work, a log of recent achievements, known issues or challenges, and identified next steps.
*   **`AI_ENGAGEMENT_MODEL.md`** (or similar, e.g., `AI_COLLABORATION_GUIDELINES.md`, `INTERACTION_FRAMEWORK.md`):
    *   **Role:** Defines the agreed-upon interaction model and communication protocols between the human team members and the AI assistant. This might include AI persona guidelines (if applicable), preferred thinking frameworks, communication styles, and any specific engagement approaches for AI collaboration.
*   **`BRIEFCASE_DIGEST.json`**:
    *   **Role:** An automatically generated JSON file that aggregates the full content of the primary markdown files (e.g., `README.md`, `STRATEGIC_OVERVIEW.md`, `ACTIVITY_LOG.md`, `AI_ENGAGEMENT_MODEL.md`). This allows for easier programmatic parsing and ingestion of the briefcase context by an AI assistant.

*(Note: Specific filenames for `STRATEGIC_OVERVIEW.md`, `ACTIVITY_LOG.md`, and `AI_ENGAGEMENT_MODEL.md` can be adapted to best suit the project, but their roles as described should be maintained. The `BRIEFCASE_DIGEST.json` should reflect the actual filenames used.)*

## 3. Briefcase Management Protocol

Effective management of the briefcase is crucial for its utility.

### 3.1. Maintaining Context (Priming the AI)

At the beginning of a new development session, or whenever the AI's context needs to be refreshed:

1.  **Primary Method:** Provide the AI assistant with the **full content of `BRIEFCASE_DIGEST.json`**. This is the most efficient way for the AI to ingest the entire current context.
2.  **Alternative/Supplementary Method:**
    *   Provide the **full content of `ACTIVITY_LOG.md`** (or its project-specific equivalent). This gives the AI the most up-to-date operational status.
    *   Provide **relevant excerpts or a summary of `STRATEGIC_OVERVIEW.md`** (or its project-specific equivalent) tailored to the current session's goals or discussion points.
    *   If necessary, provide **relevant excerpts from `AI_ENGAGEMENT_MODEL.md`** (or its project-specific equivalent) to reinforce specific aspects of the desired interaction style.

### 3.2. Updating Briefcase Documents

The briefcase documents are *living documents* and must be kept up-to-date to remain useful.

1.  **User Responsibility:**
    *   The **human team members are ultimately responsible for making actual modifications** to the core markdown files (e.g., `STRATEGIC_OVERVIEW.md`, `ACTIVITY_LOG.md`, `AI_ENGAGEMENT_MODEL.md`). This includes logging new progress, updating feature lists, refining concepts, etc.
    *   Regularly review and update these files to reflect the current state of the project, especially after significant development milestones or changes in direction.
2.  **AI's Role in Suggesting Updates:**
    *   The AI assistant can be actively involved in maintaining the briefcase by **suggesting updates, drafting new sections, or proposing revisions** to the documents. For example, you can ask the AI to:
        *   "Draft an entry for `ACTIVITY_LOG.md` based on the features we just discussed/implemented."
        *   "Suggest additions to the 'Planned Features' section in `STRATEGIC_OVERVIEW.md`."
    *   The human team should then review these AI-generated suggestions and manually incorporate them into the relevant files.
3.  **Regenerating `BRIEFCASE_DIGEST.json`**:
    *   **Crucially, after any changes are made to the content of the source markdown files (e.g., `STRATEGIC_OVERVIEW.md`, `ACTIVITY_LOG.md`, `AI_ENGAGEMENT_MODEL.md`, `README.md`), the `BRIEFCASE_DIGEST.json` file MUST be regenerated.**
    *   This ensures that the AI receives the most current information when primed using the digest. This regeneration can be done via a script, a manual process of concatenation, or through a project-specific tool if available.

### 3.3. Packaging and Sharing the Briefcase

To ensure all collaborators (human or AI) have the latest context:

*   **Regularly Package:** Create an archive (e.g., a ZIP file) of the entire briefcase directory, especially after significant updates.
*   **Ensure Digest is Current:** Before packaging, always ensure `BRIEFCASE_DIGEST.json` has been regenerated to reflect the latest changes in the markdown files.
*   **Distribution:** Make this packaged briefcase readily available to all relevant parties or place it in a shared repository.

## 4. Key Principles for Briefcase Management

*   **Living Documents:** Treat all briefcase files as dynamic and subject to ongoing updates.
*   **Accuracy and Recency:** Strive to keep the information within the briefcase accurate and reflective of the latest project status. Outdated information diminishes its value.
*   **User Oversight:** While the AI can assist in drafting content, the human team is responsible for the final accuracy, integration, and physical saving of changes to the files.
*   **Consistent Regeneration of Digest:** Always regenerate `BRIEFCASE_DIGEST.json` after modifying any of its source markdown files.

By adhering to this protocol, the Project Briefcase will serve as a powerful tool for maintaining clarity, continuity, and effective AI-assisted collaboration on any project.