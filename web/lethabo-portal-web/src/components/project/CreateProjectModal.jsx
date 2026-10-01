import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { SelectField, TextField } from '../ui/Fields'
import { Modal } from '../ui/Modal'
import { useAppState } from '../../state/useAppState'

const EMPTY = { clientId: '', name: '', description: '', dueLabel: '', service: '' }

export function CreateProjectModal({ open, onClose }) {
  const { clients, members, createProject } = useAppState()
  const navigate = useNavigate()
  const [memberIds, setMemberIds] = useState(['nk'])
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const close = () => {
    setForm(EMPTY)
    setErrors({})
    onClose()
  }

  const toggleMember = (id) => {
    setMemberIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const submit = (event) => {
    event.preventDefault()
    const result = createProject({ ...form, memberIds })
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
        {errors.form ? <div className="form-error">{errors.form}</div> : null}
        <SelectField label="Client" name="clientId" value={form.clientId} error={errors.clientId} onChange={(event) => setField('clientId', event.target.value)}>
          <option value="">Select a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </SelectField>
        <TextField label="Project title" name="name" value={form.name} error={errors.name} onChange={(event) => setField('name', event.target.value)} placeholder="Website Rebuild" />
        <TextField label="Description" name="description" value={form.description} error={errors.description} onChange={(event) => setField('description', event.target.value)} placeholder="What this engagement covers" />
        <TextField label="Service" name="service" value={form.service} onChange={(event) => setField('service', event.target.value)} placeholder="Web development" />
        <TextField label="Due date" name="dueLabel" value={form.dueLabel} error={errors.dueLabel} onChange={(event) => setField('dueLabel', event.target.value)} placeholder="12 Oct" />
        <div className="field">
          <span className="field__label">Team</span>
          <div className="check-grid">
            {members.map((member) => (
              <label key={member.id}>
                <input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />
                {member.shortName}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit">Create project</Button>
      </form>
    </Modal>
  )
}
