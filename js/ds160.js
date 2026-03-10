// ============================================================
//  PureForm — DS-160 Form Logic & PDF Generation
// ============================================================

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById('ds160Form');
const pdfBtn = document.getElementById('pdfBtn');
const submitBtn = document.getElementById('submitBtn');

// Handle PDF Generation
pdfBtn.addEventListener('click', () => {
  const element = document.getElementById('ds160FormArea');
  
  // Create a clone to remove "Submit" buttons from PDF
  const opt = {
    margin:       [10, 10],
    filename:     'Solicitud_Pre_DS-160.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Temporarily hide buttons for the PDF
  const buttonsGroup = document.querySelector('.no-print');
  buttonsGroup.style.display = 'none';

  html2pdf().set(opt).from(element).save().then(() => {
    buttonsGroup.style.display = 'block';
  });
});

// Handle Form Submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Add metadata
  data.formType = 'DS-160';
  data.submittedAt = serverTimestamp();
  data.status = 'pendiente';

  try {
    const docRef = await addDoc(collection(db, "submissions"), data);
    console.log("Document written with ID: ", docRef.id);
    
    alert('¡Formulario enviado con éxito!');
    form.reset();
  } catch (error) {
    console.error("Error adding document: ", error);
    alert('Hubo un error al enviar el formulario. Por favor, intente de nuevo.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar Formulario';
  }
});
