// =============================================================
// Formulario de Censo Completo (Expandido)
// 4 pasos: Vivienda, Jefe de Familia, Miembros, Servicios/Programas
// Con campos obligatorios del censo comunal venezolano
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FiPlus, FiTrash2, FiSave, FiUser, FiHome, FiUsers,
  FiZap, FiCheckCircle, FiAlertCircle, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

const CENSO_DRAFT_KEY = 'araure-censo-borrador-v1';

interface Calle {
  id: string;
  nombre: string;
  comunidad: { id: string; nombre: string };
}

interface Miembro {
  nombre: string;
  cedula: string;
  nacionalidad: string;
  fechaNacimiento: string;
  genero: string;
  parentesco: string;
  estadoCivil: string;
  escolaridad: string;
  ocupacion: string;
  lugarTrabajo: string;
  salud: string;
  pensionado: boolean;
  discapacidad: boolean;
  tipoDiscapacidad: string;
  embarazada: boolean;
  lactancia: boolean;
}

const miembroVacio: Miembro = {
  nombre: '', cedula: '', nacionalidad: 'V', fechaNacimiento: '', genero: '',
  parentesco: '', estadoCivil: '', escolaridad: '', ocupacion: '', lugarTrabajo: '',
  salud: '', pensionado: false, discapacidad: false, tipoDiscapacidad: '',
  embarazada: false, lactancia: false,
};

export default function CensarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [calles, setCalles] = useState<Calle[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Datos del formulario
  const [calleId, setCalleId] = useState(searchParams.get('calleId') || '');

  const [vivienda, setVivienda] = useState({
    direccion: '', tipoVivienda: '', tenencia: '', materialConstruccion: '',
    cantidadHabitaciones: '', cantidadBanos: '', observaciones: '',
  });

  const [servicios, setServicios] = useState({
    servicioAgua: '', servicioElectricidad: '', servicioGas: '',
    servicioInternet: '', servicioAseo: '', servicioTelefono: '',
  });

  const [programas, setProgramas] = useState({
    carnetPatria: false, codigoCarnetPatria: '', recibeClap: false,
    otrosBeneficios: '', ingresoFamiliar: '',
  });

  const [jefe, setJefe] = useState({
    jfNombre: '', jfCedula: '', jfNacionalidad: 'V', jfFechaNac: '', jfGenero: '',
    jfEstadoCivil: '', jfTelefono: '', jfEmail: '', jfEscolaridad: '',
    jfOcupacion: '', jfLugarTrabajo: '', jfPensionado: false,
    jfDiscapacidad: false, jfTipoDiscapacidad: '', jfEnfermedad: '',
    jfEmbarazada: false, jfLactancia: false,
  });

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [draftChecked, setDraftChecked] = useState(false);

  useEffect(() => {
    if (!session || draftChecked) return;
    try {
      const raw = sessionStorage.getItem(CENSO_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as {
          step?: number;
          calleId?: string;
          vivienda?: Record<string, string>;
          servicios?: Record<string, string>;
          programas?: Record<string, string | boolean>;
          jefe?: Record<string, string | boolean>;
          miembros?: Miembro[];
        };
        if (
          window.confirm(
            'Hay un borrador de censo sin enviar. ¿Desea continuar donde lo dejó?'
          )
        ) {
          if (typeof d.step === 'number') setStep(d.step);
          if (d.calleId !== undefined) setCalleId(d.calleId);
          if (d.vivienda) setVivienda((prev) => ({ ...prev, ...d.vivienda }));
          if (d.servicios) setServicios((prev) => ({ ...prev, ...d.servicios }));
          if (d.programas) setProgramas((prev) => ({ ...prev, ...d.programas }));
          if (d.jefe) setJefe((prev) => ({ ...prev, ...d.jefe }));
          if (d.miembros?.length) setMiembros(d.miembros);
        } else {
          sessionStorage.removeItem(CENSO_DRAFT_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(CENSO_DRAFT_KEY);
    }
    setDraftChecked(true);
  }, [session, draftChecked]);

  useEffect(() => {
    if (!session || !draftChecked) return;
    const userId = session.user.id;
    const role = session.user.role;

    const url = role === 'JEFE_CALLE'
      ? `/api/calles?jefeCalleId=${userId}`
      : '/api/calles';

    apiFetch(url)
      .then((r) => r.json())
      .then((data: Calle[]) => {
        setCalles(data);
        if (data.length === 1 && !calleId) setCalleId(data[0].id);
      })
      .catch(console.error);
  }, [session, draftChecked, calleId]);

  useEffect(() => {
    if (!session || !draftChecked) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(
          CENSO_DRAFT_KEY,
          JSON.stringify({
            step,
            calleId,
            vivienda,
            servicios,
            programas,
            jefe,
            miembros,
          })
        );
      } catch {
        /* almacenamiento lleno u offline */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [session, draftChecked, step, calleId, vivienda, servicios, programas, jefe, miembros]);

  const addMiembro = () => setMiembros([...miembros, { ...miembroVacio }]);
  const removeMiembro = (i: number) => setMiembros(miembros.filter((_, idx) => idx !== i));
  const updateMiembro = (i: number, field: string, value: any) => {
    const updated = [...miembros];
    (updated[i] as any)[field] = value;
    setMiembros(updated);
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!calleId) { toast.error('Seleccione una calle'); return false; }
      if (!vivienda.direccion) { toast.error('La dirección es obligatoria'); return false; }
      if (!vivienda.tipoVivienda) { toast.error('El tipo de vivienda es obligatorio'); return false; }
      if (!vivienda.tenencia) { toast.error('La tenencia es obligatoria'); return false; }
    }
    if (s === 2) {
      if (!jefe.jfNombre) { toast.error('El nombre del jefe es obligatorio'); return false; }
      if (!jefe.jfCedula) { toast.error('La cédula del jefe es obligatoria'); return false; }
      if (!jefe.jfFechaNac) { toast.error('La fecha de nacimiento es obligatoria'); return false; }
      if (!jefe.jfGenero) { toast.error('El género del jefe es obligatorio'); return false; }
      if (!jefe.jfNacionalidad) { toast.error('La nacionalidad es obligatoria'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      toast.error('Revise los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/familias', {
        method: 'POST',
        body: JSON.stringify({
          calleId,
          ...vivienda,
          ...servicios,
          ...programas,
          ...jefe,
          miembros: miembros.filter((m) => m.nombre.trim() !== ''),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      try {
        sessionStorage.removeItem(CENSO_DRAFT_KEY);
      } catch {
        /* ignore */
      }

      toast.success('¡Familia censada exitosamente!');
      const role = session?.user?.role;
      router.push(role === 'ADMIN' ? '/dashboard/familias' : '/mi-calle/familias');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el censo');
    } finally {
      setLoading(false);
    }
  };

  // Opciones de select
  const tiposVivienda = ['Casa', 'Apartamento', 'Rancho', 'Quinta', 'Habitación', 'Otro'];
  const tiposTenencia = ['Propia', 'Alquilada', 'Prestada', 'Invadida', 'Herencia', 'Otro'];
  const materialesConstruccion = ['Bloque', 'Bahareque', 'Zinc', 'Madera', 'Mixto', 'Otro'];
  const opcionesAgua = ['Tubería directa', 'Cisterna', 'Pozo', 'No tiene'];
  const opcionesElectricidad = ['Sí', 'No', 'Irregular'];
  const opcionesGas = ['Directo', 'Bombona', 'Leña', 'No tiene'];
  const opcionesSiNo = ['Sí', 'No'];
  const opcionesAseo = ['Sí', 'No', 'Irregular'];
  const opcionesTelefono = ['Fijo', 'Solo Celular', 'No tiene'];
  const estadosCiviles = ['Soltero/a', 'Casado/a', 'Concubino/a', 'Divorciado/a', 'Viudo/a'];
  const escolaridades = ['Ninguna', 'Preescolar', 'Primaria', 'Secundaria', 'Bachillerato', 'Técnico Superior', 'Universitaria', 'Postgrado'];
  const parentescos = ['Esposo/a', 'Hijo/a', 'Nieto/a', 'Padre/Madre', 'Hermano/a', 'Abuelo/a', 'Tío/a', 'Sobrino/a', 'Primo/a', 'Cuñado/a', 'Suegro/a', 'Yerno/Nuera', 'Otro'];
  const ingresosFamiliares = ['Menos de 1 salario mínimo', '1 a 2 salarios mínimos', '2 a 3 salarios mínimos', 'Más de 3 salarios mínimos'];

  const steps = [
    { n: 1, label: 'Vivienda', icon: FiHome },
    { n: 2, label: 'Jefe de Familia', icon: FiUser },
    { n: 3, label: 'Miembros', icon: FiUsers },
    { n: 4, label: 'Servicios', icon: FiZap },
  ];

  // Helper para label obligatorio
  const Req = ({ children }: { children: React.ReactNode }) => (
    <label className="input-label">
      {children} <span className="text-red-400">*</span>
    </label>
  );

  const Opt = ({ children }: { children: React.ReactNode }) => (
    <label className="input-label">{children}</label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Censar Nueva Familia</h2>
        <p className="text-slate-500 mt-1">Complete el formulario de censo paso a paso</p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {steps.map(({ n, label, icon: Icon }) => (
          <button
            key={n}
            onClick={() => { if (n < step || validateStep(step)) setStep(n); }}
            className={`flex-1 p-2.5 sm:p-3 rounded-xl flex items-center gap-1.5 justify-center text-xs sm:text-sm font-medium transition-all
              ${step === n ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' :
              n < step ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
              'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {n < step ? <FiCheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{n}</span>
          </button>
        ))}
      </div>

      {/* Selección de calle */}
      <div className="glass-card p-4 sm:p-5">
        <Req>Calle / Sector</Req>
        <select value={calleId} onChange={(e) => setCalleId(e.target.value)} className="select-field" required>
          <option value="">Seleccionar calle...</option>
          {calles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} — {c.comunidad?.nombre?.replace('Consejo Comunal ', '')}
            </option>
          ))}
        </select>
      </div>

      {/* PASO 1: Datos de Vivienda */}
      {step === 1 && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiHome className="w-5 h-5 text-blue-400" />
            Datos de la Vivienda
          </h3>

          <div>
            <Req>Dirección Exacta</Req>
            <input value={vivienda.direccion} onChange={(e) => setVivienda({ ...vivienda, direccion: e.target.value })}
              className="input-field" placeholder="Ej: Casa #15, Calle Principal, frente a la bodega" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Req>Tipo de Vivienda</Req>
              <select value={vivienda.tipoVivienda} onChange={(e) => setVivienda({ ...vivienda, tipoVivienda: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {tiposVivienda.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Req>Tenencia</Req>
              <select value={vivienda.tenencia} onChange={(e) => setVivienda({ ...vivienda, tenencia: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {tiposTenencia.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Opt>Material de Construcción</Opt>
              <select value={vivienda.materialConstruccion} onChange={(e) => setVivienda({ ...vivienda, materialConstruccion: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {materialesConstruccion.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Opt>Nº Habitaciones</Opt>
              <input type="number" min="0" max="20" value={vivienda.cantidadHabitaciones}
                onChange={(e) => setVivienda({ ...vivienda, cantidadHabitaciones: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <Opt>Nº Baños</Opt>
              <input type="number" min="0" max="10" value={vivienda.cantidadBanos}
                onChange={(e) => setVivienda({ ...vivienda, cantidadBanos: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
          </div>

          <div>
            <Opt>Observaciones</Opt>
            <textarea value={vivienda.observaciones} onChange={(e) => setVivienda({ ...vivienda, observaciones: e.target.value })}
              className="input-field" rows={2} placeholder="Observaciones sobre la vivienda..." />
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={nextStep} className="btn-primary flex items-center gap-2">
              Siguiente <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Datos del Jefe de Familia */}
      {step === 2 && (
        <div className="glass-card p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiUser className="w-5 h-5 text-emerald-400" />
            Datos del Jefe de Familia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Req>Nombre Completo</Req>
              <input value={jefe.jfNombre} onChange={(e) => setJefe({ ...jefe, jfNombre: e.target.value })}
                className="input-field" placeholder="Nombre y apellido" />
            </div>
            <div>
              <Req>Cédula de Identidad</Req>
              <div className="flex gap-2">
                <select value={jefe.jfNacionalidad} onChange={(e) => setJefe({ ...jefe, jfNacionalidad: e.target.value })}
                  className="select-field w-20 flex-shrink-0">
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
                <input value={jefe.jfCedula} onChange={(e) => setJefe({ ...jefe, jfCedula: e.target.value })}
                  className="input-field flex-1" placeholder="12345678" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Req>Fecha de Nacimiento</Req>
              <input type="date" value={jefe.jfFechaNac} onChange={(e) => setJefe({ ...jefe, jfFechaNac: e.target.value })} className="input-field" />
            </div>
            <div>
              <Req>Género</Req>
              <select value={jefe.jfGenero} onChange={(e) => setJefe({ ...jefe, jfGenero: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <Opt>Estado Civil</Opt>
              <select value={jefe.jfEstadoCivil} onChange={(e) => setJefe({ ...jefe, jfEstadoCivil: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {estadosCiviles.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Opt>Teléfono</Opt>
              <input value={jefe.jfTelefono} onChange={(e) => setJefe({ ...jefe, jfTelefono: e.target.value })}
                className="input-field" placeholder="0414-1234567" />
            </div>
            <div>
              <Opt>Email</Opt>
              <input type="email" value={jefe.jfEmail} onChange={(e) => setJefe({ ...jefe, jfEmail: e.target.value })}
                className="input-field" placeholder="correo@ejemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Opt>Nivel de Escolaridad</Opt>
              <select value={jefe.jfEscolaridad} onChange={(e) => setJefe({ ...jefe, jfEscolaridad: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {escolaridades.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <Opt>Ocupación</Opt>
              <input value={jefe.jfOcupacion} onChange={(e) => setJefe({ ...jefe, jfOcupacion: e.target.value })}
                className="input-field" placeholder="Ej: Comerciante, Docente..." />
            </div>
          </div>

          <div>
            <Opt>Lugar de Trabajo</Opt>
            <input value={jefe.jfLugarTrabajo} onChange={(e) => setJefe({ ...jefe, jfLugarTrabajo: e.target.value })}
              className="input-field" placeholder="Nombre de empresa o lugar" />
          </div>

          <div>
            <Opt>Enfermedades Crónicas</Opt>
            <input value={jefe.jfEnfermedad} onChange={(e) => setJefe({ ...jefe, jfEnfermedad: e.target.value })}
              className="input-field" placeholder="Ej: Diabetes, Hipertensión, Ninguna..." />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-slate-700/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={jefe.jfPensionado} onChange={(e) => setJefe({ ...jefe, jfPensionado: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500" />
              <span className="text-sm text-slate-400">Pensionado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={jefe.jfDiscapacidad} onChange={(e) => setJefe({ ...jefe, jfDiscapacidad: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500" />
              <span className="text-sm text-slate-400">Discapacidad</span>
            </label>
            {jefe.jfGenero === 'F' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jefe.jfEmbarazada} onChange={(e) => setJefe({ ...jefe, jfEmbarazada: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500 focus:ring-pink-500" />
                  <span className="text-sm text-slate-400">Embarazada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jefe.jfLactancia} onChange={(e) => setJefe({ ...jefe, jfLactancia: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500 focus:ring-pink-500" />
                  <span className="text-sm text-slate-400">Lactancia</span>
                </label>
              </>
            )}
          </div>
          {jefe.jfDiscapacidad && (
            <div>
              <Opt>Tipo de Discapacidad</Opt>
              <input value={jefe.jfTipoDiscapacidad} onChange={(e) => setJefe({ ...jefe, jfTipoDiscapacidad: e.target.value })}
                className="input-field" placeholder="Tipo de discapacidad" />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
              <FiChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={nextStep} className="btn-primary flex items-center gap-2">
              Siguiente <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Miembros de Familia */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-purple-400" />
                Miembros del Hogar ({miembros.length})
              </h3>
              <button onClick={addMiembro} className="btn-primary flex items-center gap-2 text-sm py-2">
                <FiPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar</span> Miembro
              </button>
            </div>

            {miembros.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se han agregado miembros</p>
                <p className="text-xs mt-1">Haga clic en &quot;Agregar Miembro&quot; para añadir personas al hogar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {miembros.map((m, i) => (
                  <div key={i} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-slate-300">Miembro #{i + 1}</h4>
                      <button onClick={() => removeMiembro(i)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Req>Nombre Completo</Req>
                        <input value={m.nombre} onChange={(e) => updateMiembro(i, 'nombre', e.target.value)} className="input-field text-sm py-2" placeholder="Nombre y apellido" />
                      </div>
                      <div>
                        <Opt>Cédula</Opt>
                        <div className="flex gap-1">
                          <select value={m.nacionalidad} onChange={(e) => updateMiembro(i, 'nacionalidad', e.target.value)} className="select-field text-sm py-2 w-16">
                            <option value="V">V</option>
                            <option value="E">E</option>
                          </select>
                          <input value={m.cedula} onChange={(e) => updateMiembro(i, 'cedula', e.target.value)} className="input-field text-sm py-2 flex-1" placeholder="12345678" />
                        </div>
                      </div>
                      <div>
                        <Req>Fecha de Nacimiento</Req>
                        <input type="date" value={m.fechaNacimiento} onChange={(e) => updateMiembro(i, 'fechaNacimiento', e.target.value)} className="input-field text-sm py-2" />
                      </div>
                      <div>
                        <Req>Género</Req>
                        <select value={m.genero} onChange={(e) => updateMiembro(i, 'genero', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </select>
                      </div>
                      <div>
                        <Req>Parentesco</Req>
                        <select value={m.parentesco} onChange={(e) => updateMiembro(i, 'parentesco', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          {parentescos.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <Opt>Estado Civil</Opt>
                        <select value={m.estadoCivil} onChange={(e) => updateMiembro(i, 'estadoCivil', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          {estadosCiviles.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <Opt>Escolaridad</Opt>
                        <select value={m.escolaridad} onChange={(e) => updateMiembro(i, 'escolaridad', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          {escolaridades.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <Opt>Ocupación</Opt>
                        <input value={m.ocupacion} onChange={(e) => updateMiembro(i, 'ocupacion', e.target.value)} className="input-field text-sm py-2" placeholder="Ocupación" />
                      </div>
                      <div>
                        <Opt>Enfermedades / Salud</Opt>
                        <input value={m.salud} onChange={(e) => updateMiembro(i, 'salud', e.target.value)} className="input-field text-sm py-2" placeholder="Condiciones de salud..." />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-slate-700/30">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={m.pensionado} onChange={(e) => updateMiembro(i, 'pensionado', e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500" />
                        <span className="text-xs text-slate-400">Pensionado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={m.discapacidad} onChange={(e) => updateMiembro(i, 'discapacidad', e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500" />
                        <span className="text-xs text-slate-400">Discapacidad</span>
                      </label>
                      {m.genero === 'F' && (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={m.embarazada} onChange={(e) => updateMiembro(i, 'embarazada', e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500" />
                            <span className="text-xs text-slate-400">Embarazada</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={m.lactancia} onChange={(e) => updateMiembro(i, 'lactancia', e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500" />
                            <span className="text-xs text-slate-400">Lactancia</span>
                          </label>
                        </>
                      )}
                      {m.discapacidad && (
                        <div className="flex-1 min-w-[180px]">
                          <input value={m.tipoDiscapacidad} onChange={(e) => updateMiembro(i, 'tipoDiscapacidad', e.target.value)}
                            className="input-field text-sm py-1.5" placeholder="Tipo de discapacidad" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={prevStep} className="btn-secondary flex items-center gap-2">
              <FiChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={nextStep} className="btn-primary flex items-center gap-2">
              Siguiente <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: Servicios y Programas Sociales */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiZap className="w-5 h-5 text-yellow-400" />
              Servicios Básicos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Opt>Servicio de Agua</Opt>
                <select value={servicios.servicioAgua} onChange={(e) => setServicios({ ...servicios, servicioAgua: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesAgua.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Electricidad</Opt>
                <select value={servicios.servicioElectricidad} onChange={(e) => setServicios({ ...servicios, servicioElectricidad: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesElectricidad.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Gas</Opt>
                <select value={servicios.servicioGas} onChange={(e) => setServicios({ ...servicios, servicioGas: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesGas.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Internet</Opt>
                <select value={servicios.servicioInternet} onChange={(e) => setServicios({ ...servicios, servicioInternet: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesSiNo.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Aseo Urbano</Opt>
                <select value={servicios.servicioAseo} onChange={(e) => setServicios({ ...servicios, servicioAseo: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesAseo.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Telefonía</Opt>
                <select value={servicios.servicioTelefono} onChange={(e) => setServicios({ ...servicios, servicioTelefono: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesTelefono.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-emerald-400" />
              Programas Sociales y Economía
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <input type="checkbox" checked={programas.carnetPatria}
                    onChange={(e) => setProgramas({ ...programas, carnetPatria: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-blue-500" />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Carnet de la Patria</span>
                    <p className="text-xs text-slate-500">¿La familia posee carnet?</p>
                  </div>
                </label>
                {programas.carnetPatria && (
                  <div className="ml-8">
                    <Opt>Código del Carnet</Opt>
                    <input value={programas.codigoCarnetPatria}
                      onChange={(e) => setProgramas({ ...programas, codigoCarnetPatria: e.target.value })}
                      className="input-field text-sm" placeholder="Código del carnet" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <input type="checkbox" checked={programas.recibeClap}
                    onChange={(e) => setProgramas({ ...programas, recibeClap: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-emerald-500" />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Recibe CLAP</span>
                    <p className="text-xs text-slate-500">¿Reciben caja CLAP?</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Opt>Ingreso Familiar</Opt>
                <select value={programas.ingresoFamiliar}
                  onChange={(e) => setProgramas({ ...programas, ingresoFamiliar: e.target.value })} className="select-field">
                  <option value="">Seleccionar rango...</option>
                  {ingresosFamiliares.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <Opt>Otros Beneficios Sociales</Opt>
                <input value={programas.otrosBeneficios}
                  onChange={(e) => setProgramas({ ...programas, otrosBeneficios: e.target.value })}
                  className="input-field" placeholder="Hogares de la Patria, Misiones, etc." />
              </div>
            </div>
          </div>

          {/* Resumen y envío */}
          <div className="glass-card p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-blue-400" />
              Resumen del Censo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-blue-400">{miembros.length + 1}</p>
                <p className="text-xs text-slate-500">Personas</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-emerald-400">{vivienda.tipoVivienda || '—'}</p>
                <p className="text-xs text-slate-500">Vivienda</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-yellow-400">{programas.carnetPatria ? 'Sí' : 'No'}</p>
                <p className="text-xs text-slate-500">Carnet Patria</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-cyan-400">{programas.recibeClap ? 'Sí' : 'No'}</p>
                <p className="text-xs text-slate-500">CLAP</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <button onClick={prevStep} className="btn-secondary flex items-center justify-center gap-2">
              <FiChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="btn-success flex items-center justify-center gap-2 py-3 px-8 text-base">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Guardar Censo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
