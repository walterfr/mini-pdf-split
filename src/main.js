import './style.css';
import { createIcons, BookOpenCheck, UploadCloud, FileText, X, Scissors, Columns2, Rows2, FileBadge2 } from 'lucide';
import { PDFDocument } from 'pdf-lib';

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
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      updateProgress(10 + (i / pages.length) * 80, `Processando página ${i + 1} de ${pages.length}...`);

      if (i === 0 && skipFirstPage) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
        newPdfDoc.addPage(copiedPage);
        continue;
      }

      if (splitDirection === 'vertical') {
        // Vertical Split (Book style)
        const halfWidth = width / 2;
        
        // Left Page
        const leftPage = newPdfDoc.addPage([halfWidth, height]);
        const embeddedPage1 = await newPdfDoc.embedPage(page);
        leftPage.drawPage(embeddedPage1, {
          width: width,
          height: height,
          x: 0,
          y: 0,
        });

        // Right Page
        const rightPage = newPdfDoc.addPage([halfWidth, height]);
        const embeddedPage2 = await newPdfDoc.embedPage(page);
        rightPage.drawPage(embeddedPage2, {
          width: width,
          height: height,
          x: -halfWidth,
          y: 0,
        });
      } else {
        // Horizontal Split
        const halfHeight = height / 2;
        
        // Top Page
        const topPage = newPdfDoc.addPage([width, halfHeight]);
        const embeddedPage1 = await newPdfDoc.embedPage(page);
        topPage.drawPage(embeddedPage1, {
          width: width,
          height: height,
          x: 0,
          y: -halfHeight,
        });

        // Bottom Page
        const bottomPage = newPdfDoc.addPage([width, halfHeight]);
        const embeddedPage2 = await newPdfDoc.embedPage(page);
        bottomPage.drawPage(embeddedPage2, {
          width: width,
          height: height,
          x: 0,
          y: 0,
        });
      }
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
