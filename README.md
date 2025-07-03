

![Screenshot 2025-06-03 134005](https://github.com/user-attachments/assets/7d93405b-16f0-4cc5-b040-35ed66971376)

import -- txt types, json etc.. and .md, jpg png
load session .. load .ccc whiteboard session file
clear -- clears the whiteboard
tools -- self explanatory, select.move.shapes. flowchart

sessionname -- be specific when naming
save img save an image of the whiteboard
save session, lets you pause and grab a coffee and close down or continue, if you restart just load the appropriate .ccc session file
save card, save the white board content as a zipfile. 

structure is 
|   application_metadata.json
|   canvas_image.png
|   full_app_screenshot.png
|   model_card.html
|   tree.txt
|   whiteboard_elements.json
|   
\---prompt_cards
        Gemini_Response_20250604_225237.md
        Gemini_Response_20250605_005416.md
        Gemini_Response_20250605_005559.md
        Gemini_Response_20250605_005732.md
        Gemini_Response_20250605_010120.md
        Gemini_Response_20250605_010540.md
        Gemini_Response_20250605_011237.md
        Gemini_Response_20250605_011801.md
        Gemini_Response_20250605_012147.md
        Gemini_Response_20250605_012319.md
        Gemini_Response_20250605_012408.md
        Gemini_Response_20250605_012727.md
        Gemini_Response_20250605_012817.md
        Gemini_Response_20250605_012959.md
        Gemini_Response_20250605_013133.md
        Gemini_Response_20250605_013301.md
        Gemini_Response_20250605_013456.md
        Gemini_Response_20250605_013614.md
        Gemini_Response_20250605_013706.md

        .md files are prompt/response pairs and are sequenced 
        eg 
        
-------------------------------------------------------------
## User Prompt
Explain the utility of the system, imagine the system working


## Gemini's Response
Okay, I can explain the utility of the system depicted on the whiteboard and imagine how it works.

Based on the diagrams and text, the system appears to be a platform designed to manage, analyze, and retrieve data 'capsules', particularly focusing on images and associated information. Its primary utility lies in:

1.  **Standardized Data Handling:** It provides a structured way to ingest various content types (images, text, PDF) and encapsulate them into a standardized 'capsule' format. This simplifies processing, storage, and retrieval.
2.  **Enhanced Search and Retrieval:** By storing data in both an RDBMS (for structured metadata and keyword search) and a Vector DB (for semantic search on embeddings), the system enables flexible retrieval based on keywords, concepts, or visual similarity.
3.  **Rich Metadata and Analysis:** The ingestion process includes content analysis, extracting information, generating embeddings, and associating metadata, creating a rich dataset for each capsule.
4.  **Integrated Viewer:** The 'Capsule Data Viewer' provides a comprehensive interface to examine all aspects of a capsule, including the original source, extracted information, generated content, and provenance.
5.  **Facilitating AI Interaction:** Components like 'co-create' and 'imagen-context-prompt' suggest capabilities for using AI to generate content or interact with the data based on context.

**Imagine the system working:**

A user has a collection of historical documents, some containing images. They use the system's 'IngestionAndAnalysis' flow. They upload a document (e.g., a scanned PDF with images and text). The system checks the content type, analyzes the text and images, perhaps using an 'Image Component Generator' to identify key elements in the images. It extracts metadata (date, source, etc.) and generates text summaries or descriptions. It then creates numerical embeddings for both the text and images and stores these embeddings in the Vector DB. A 'JSON Capsule' is created containing all this information, including a reference to the original image stored in an 'Image Repository'. This capsule and its metadata are then stored in the RDBMS.

Later, the user wants to find documents related to 'farming equipment' but doesn't remember the exact keywords or where the image is. They use the 'UserRetrievalAndDisplay' flow. They could perform a keyword search ('farming equipment') which queries the RDBMS, or a semantic search (e.g., using a phrase describing farming equipment) which queries the Vector DB using the semantic embeddings. The search returns a list of 'Capsule IDs'. The user selects one. The system retrieves the capsule metadata from the RDBMS and the associated image from the Image Repository. The 'Capsule Data Viewer' then displays all the information: the original image, the extracted text, the generated description, keywords, provenance, and potentially related capsules found via embeddings. The user can easily see all the relevant context for the document and its image in one place.
------------------------------------- 

Save briefcase - the contents of the briefcase are saved as a zip file.
contents are:
![image](https://github.com/user-attachments/assets/9847b1f0-d99b-4765-a625-114243d5b9aa)









# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
