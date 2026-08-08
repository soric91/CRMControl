import { tariffsApi } from '../../api';
import type { Tariff } from '../../api';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Input } from '../../components/ui/Input';
import { useResourceForm } from '../../hooks/useResourceForm';
import { useToast } from '../../hooks/useToast';
import { formatMonth } from '../../lib/formatters';

interface TariffFormValues {
  /** `YYYY-MM`, the shape an `<input type="month">` speaks. */
  mes: string;
  /** Decimals stay text end to end so the prices never pass through a float. */
  valor_importado: string;
  valor_excedente: string;
}

/** `2026-01-01` → `2026-01`. */
function toMonthInput(iso: string): string {
  return iso.slice(0, 7);
}

/** `2026-01` → `2026-01-01`, the first day the backend stores. */
function toFirstDay(month: string): string {
  return `${month}-01`;
}

function priceError(value: string): string | undefined {
  if (value.trim() === '') return 'Obligatorio';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 'Tiene que ser un número';
  if (parsed < 0) return 'No puede ser negativo';
  return undefined;
}

export interface TariffFormProps {
  /** `null` creates un período nuevo; una tarifa edita sus valores. */
  tariff: Tariff | null;
  onClose: () => void;
  onSaved: (tariff: Tariff) => void;
}

export function TariffForm({ tariff, onClose, onSaved }: TariffFormProps) {
  const { notify } = useToast();
  const isEdit = tariff !== null;

  const form = useResourceForm<TariffFormValues, Tariff>({
    initialValues: {
      mes: tariff ? toMonthInput(tariff.mes) : '',
      valor_importado: tariff?.valor_importado ?? '',
      valor_excedente: tariff?.valor_excedente ?? '0',
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!/^\d{4}-\d{2}$/.test(values.mes)) {
        errors.mes = 'Elegí un mes';
      }
      const importado = priceError(values.valor_importado);
      if (importado) errors.valor_importado = importado;
      const excedente = priceError(values.valor_excedente);
      if (excedente) errors.valor_excedente = excedente;
      return errors;
    },
    conflictField: 'mes',
    errorMessages: {
      already_exists: 'Ya hay una tarifa cargada para ese mes',
    },
    submit: async (values) =>
      // El mes identifica el período: se fija al crear y no se mueve después,
      // porque un costo ya calculado tiene que seguir siendo reproducible.
      tariff
        ? tariffsApi.updateTariff(tariff.id, {
            valor_importado: values.valor_importado.trim(),
            valor_excedente: values.valor_excedente.trim(),
          })
        : tariffsApi.createTariff({
            mes: toFirstDay(values.mes),
            valor_importado: values.valor_importado.trim(),
            valor_excedente: values.valor_excedente.trim(),
          }),
    onSuccess: (saved) => {
      notify('success', isEdit ? 'Tarifa actualizada' : 'Tarifa creada');
      onSaved(saved);
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={isEdit ? 'Editar tarifa' : 'Nueva tarifa'}
      description={isEdit ? formatMonth(tariff.mes) : undefined}
      footer={
        <>
          <Button onClick={onClose} disabled={form.submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="tariff-form"
            variant="primary"
            loading={form.submitting}
          >
            {isEdit ? 'Guardar cambios' : 'Crear tarifa'}
          </Button>
        </>
      }
    >
      <form
        id="tariff-form"
        onSubmit={form.handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="tariff-mes"
          label="Período"
          type="month"
          required
          autoFocus={!isEdit}
          // Cambiar el mes movería la tarifa de período y alteraría costos ya
          // calculados. Se carga una nueva en su lugar.
          disabled={isEdit}
          hint={
            isEdit
              ? 'El período no se puede cambiar. Si te equivocaste de mes, borrá esta tarifa y cargá la correcta.'
              : 'Un mes por tarifa, para toda la plataforma.'
          }
          value={form.values.mes}
          error={form.errorFor('mes')}
          onChange={(event) => {
            form.setValue('mes', event.target.value);
          }}
        />
        <Input
          id="tariff-importado"
          label="Valor importado"
          required
          numeric
          inputMode="decimal"
          hint="Precio por kWh consumido de la red."
          value={form.values.valor_importado}
          error={form.errorFor('valor_importado')}
          onChange={(event) => {
            form.setValue('valor_importado', event.target.value);
          }}
        />
        <Input
          id="tariff-excedente"
          label="Valor excedente"
          required
          numeric
          inputMode="decimal"
          hint="Precio por kWh de excedente, el que sobra después de netear lo importado."
          value={form.values.valor_excedente}
          error={form.errorFor('valor_excedente')}
          onChange={(event) => {
            form.setValue('valor_excedente', event.target.value);
          }}
        />

        {form.formError && (
          <p role="alert" className="text-sm text-danger">
            {form.formError}
          </p>
        )}
      </form>
    </Drawer>
  );
}
