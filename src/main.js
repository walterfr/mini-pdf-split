import './style.css';
import { createIcons, BookOpenCheck, UploadCloud, FileText, X, Scissors, Columns2, Rows2, FileBadge2 } from 'lucide';
import { PDFDocument, degrees } from 'pdf-lib';

// Initialize Lucide icons
createIcons({
  icons: {
    BookOpenCheck,
    UploadCloud,
    FileText,
    X,
    Scissors,
    Columns2,
    Rows2,
    FileBadge2
  }
});

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const fileDetails = document.getElementById('file-details');
const fileNameDisplay = document.getElementById('file-name');
const fileSizeDisplay = document.getElementById('file-size');
const removeFileBtn = document.getElementById('remove-file');
const processBtn = document.getElementById('process-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressStatus = document.getElementById('progress-status');

let currentFile = null;

// Event Listeners for Upload
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('active');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('active');
  const files = e.dataTransfer.files;
  if (files.length > 0) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUpload();
});

function handleFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Por favor, selecione um arquivo PDF.');
    return;
  }
  
  currentFile = file;
  fileNameDisplay.textContent = file.name;
  fileSizeDisplay.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  
  dropZone.classList.add('hidden');
  fileDetails.classList.remove('hidden');
  processBtn.disabled = false;
}

function resetUpload() {
  currentFile = null;
  fileInput.value = '';
  dropZone.classList.remove('hidden');
  fileDetails.classList.add('hidden');
  processBtn.disabled = true;
  progressContainer.classList.add('hidden');
}

// PDF Processing Logic
processBtn.addEventListener('click', async () => {
  if (!currentFile) return;

  try {
    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    updateProgress(10, 'Lendo arquivo PDF...');

    const arrayBuffer = await currentFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const newPdfDoc = await PDFDocument.create();
    
    const pages = pdfDoc.getPages();
    const splitDirection = document.querySelector('input[name="split-direction"]:checked').value;
    const skipFirstPage = document.getElementById('skip-first-page').checked;
    const rotationAngle = parseInt(document.getElementById('rotation-angle').value);
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      updateProgress(10 + (i / pages.length) * 80, `Processando página ${i + 1} de ${pages.length}...`);

      if (i === 0 && skipFirstPage) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
        if (rotationAngle !== 0) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees(currentRot + rotationAngle));
        }
        newPdfDoc.addPage(copiedPage);
        continue;
      }

      const [page1, page2] = await newPdfDoc.copyPages(pdfDoc, [i, i]);
      
      const box = page.getCropBox() || page.getMediaBox();
      const { x, y, width, height } = box;
      
      const hw = width / 2;
      const hh = height / 2;

      // Definir os CropBoxes baseados na orientação e rotação desejada
      let crop1, crop2;

      if (splitDirection === 'vertical') {
        if (rotationAngle === 0) {
          crop1 = { x, y, width: hw, height }; // Left
          crop2 = { x: x + hw, y, width: hw, height }; // Right
        } else if (rotationAngle === 90) {
          crop1 = { x, y, width, height: hh }; // Bottom
          crop2 = { x, y: y + hh, width, height: hh }; // Top
        } else if (rotationAngle === 270 || rotationAngle === -90) {
          crop1 = { x, y: y + hh, width, height: hh }; // Top
          crop2 = { x, y, width, height: hh }; // Bottom
        } else if (rotationAngle === 180) {
          crop1 = { x: x + hw, y, width: hw, height }; // Right
          crop2 = { x, y, width: hw, height }; // Left
        }
      } else { // horizontal
        if (rotationAngle === 0) {
          crop1 = { x, y: y + hh, width, height: hh }; // Top
          crop2 = { x, y, width, height: hh }; // Bottom
        } else if (rotationAngle === 90) {
          crop1 = { x, y, width: hw, height }; // Left
          crop2 = { x: x + hw, y, width: hw, height }; // Right
        } else if (rotationAngle === 270 || rotationAngle === -90) {
          crop1 = { x: x + hw, y, width: hw, height }; // Right
          crop2 = { x, y, width: hw, height }; // Left
        } else if (rotationAngle === 180) {
          crop1 = { x, y, width, height: hh }; // Bottom
          crop2 = { x, y: y + hh, width, height: hh }; // Top
        }
      }

      page1.setCropBox(crop1.x, crop1.y, crop1.width, crop1.height);
      page2.setCropBox(crop2.x, crop2.y, crop2.width, crop2.height);

      if (rotationAngle !== 0) {
        const currentRot = page1.getRotation().angle;
        page1.setRotation(degrees(currentRot + rotationAngle));
        page2.setRotation(degrees(currentRot + rotationAngle));
      }

      newPdfDoc.addPage(page1);
      newPdfDoc.addPage(page2);
    }

    updateProgress(95, 'Gerando arquivo final...');
    const pdfBytes = await newPdfDoc.save();
    
    // Download File
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `split_${currentFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    updateProgress(100, 'Concluído!');
    setTimeout(() => {
      processBtn.disabled = false;
    }, 2000);

  } catch (error) {
    console.error(error);
    alert('Erro ao processar o PDF: ' + error.message);
    processBtn.disabled = false;
    progressContainer.classList.add('hidden');
  }
});

function updateProgress(percent, status) {
  progressFill.style.width = `${percent}%`;
  progressStatus.textContent = status;
}
