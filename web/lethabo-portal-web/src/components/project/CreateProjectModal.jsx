import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMPANY_SERVICES } from '../../domain/catalog'
import { readPreview } from '../../lib/filePreview'
import { useAppState } from '../../state/useAppState'
import { FilePreview } from './ProjectWidgets'
import { Button } from '../ui/Button'
import { SelectField, TextField } from '../ui/Fields'
import { Modal } from '../ui/Modal'

const EMPTY = { clientId: '', name: '', description: '', dueAt: '', service: '' }

export function CreateProjectModal({ open, onClose }) {
  const { clients, members, createProject } = useAppState()
  const navigate = useNavigate()
  const [memberIds, setMemberIds] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [brief, setBrief] = useState(null)
  const [errors, setErrors] = useState({})
  const developers = members.filter((member) => /developer/i.test(member.role))
  const available = developers.filter((member) => !member.allocated)

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const close = () => {
    setForm(EMPTY)
    setBrief(null)
    setMemberIds([])
    setErrors({})
    onClose()
  }

  const onBrief = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setBrief(null)
      return
    }
    try {
      setBrief(await readPreview(file))
      setErrors((current) => ({ ...current, brief: undefined }))
    } catch (error) {
      setBrief(null)
      setErrors((current) => ({ ...current, brief: error.message }))
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const result = await createProject({ ...form, memberIds, brief })
    if (!result.ok) {
      setErrors(result.errors ?? {})
      return
    }
    close()
    navigate(`/team/projects/${result.project.id}`)
  }

  return (
    <Modal title="New project" open={open} onClose={close}>
      <form className="stack" onSubmit={submit} noValidate>
        <SelectField label="Client" name="clientId" value={form.clientId} error={errors.clientId} onChange={(event) => setField('clientId', event.target.value)}>
          <option value="">Select a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </SelectField>
        <TextField label="Project title" name="name" value={form.name} error={errors.name} onChange={(event) => setField('name', event.target.value)} placeholder="Website Rebuild" />
        <TextField label="Description" name="description" value={form.description} error={errors.description} onChange={(event) => setField('description', event.target.value)} placeholder="What this engagement covers" />
        <SelectField label="Service" name="service" value={form.service} error={errors.service} onChange={(event) => setField('service', event.target.value)}>
          <option value="">Select a Lethabo M Solutions service</option>
          {COMPANY_SERVICES.map((service) => <option key={service.id} value={service.label}>{service.label}</option>)}
        </SelectField>
        <TextField label="Due date" name="dueAt" type="date" value={form.dueAt} error={errors.dueAt} onChange={(event) => setField('dueAt', event.target.value)} />
        <div className="field">
          <span className="field__label">Project file</span>
          <input className="field__control" type="file" accept="image/*,.pdf,.doc,.docx" onChange={onBrief} />
          {errors.brief ? <span className="field__error">{errors.brief}</span> : null}
          {brief ? (
            <div className="upload-preview">
              <FilePreview file={brief} large />
              <small>{brief.name}</small>
            </div>
          ) : null}
        </div>
        <fieldset className="field">
          <legend className="field__label">Available developer</legend>
          {available.length === 0 ? (
            <p className="quiet">Every software developer is already allocated. Free one on the team list before assigning a project.</p>
          ) : (
            <div className="check-grid">
              {available.map((member) => (
                <label key={member.id}>
                  <input
                    type="radio"
                    name="developer"
                    checked={memberIds.includes(member.id)}
                    onChange={() => {
                      setMemberIds([member.id])
                      setErrors((current) => ({ ...current, memberIds: undefined }))
                    }}
                  />
                  {member.shortName}
                </label>
              ))}
            </div>
          )}
          {errors.memberIds ? <span className="field__error">{errors.memberIds}</span> : null}
        </fieldset>
        {errors.form ? <p className="form-error" role="alert">{errors.form}</p> : null}
        <Button type="submit">Create project</Button>
      </form>
    </Modal>
  )
}
