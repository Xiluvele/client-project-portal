import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { SelectField, TextField } from '../ui/Fields'
import { Modal } from '../ui/Modal'
import { useAppState } from '../../state/useAppState'

export function CreateProjectModal({ open, onClose }) {
  const { clients, members, createProject } = useAppState()
  const navigate = useNavigate()
  const [memberIds, setMemberIds] = useState(['nk'])

  const toggleMember = (id) => {
    setMemberIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const submit = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const project = createProject({
      clientId: data.get('clientId'),
      name: data.get('name'),
      service: data.get('service'),
      dueLabel: data.get('dueLabel'),
      memberIds,
    })
    onClose()
    navigate(`/team/projects/${project.id}`)
  }

  return (
    <Modal title="New project" open={open} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <SelectField label="Client" name="clientId" required defaultValue={clients[0]?.id}>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </SelectField>
        <TextField label="Project name" name="name" required placeholder="Website Rebuild" />
        <TextField label="Service" name="service" placeholder="Web development" />
        <TextField label="Due" name="dueLabel" placeholder="12 Oct" />
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
