import test from 'node:test'
import assert from 'node:assert/strict'

// Scope check logic mirroring src/lib/api/scope.ts
const MANAGEMENT_ROLES = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section']

function assertClassInScope(user, classId, teacherAssignedClassIds = []) {
  if (user.roles.some(r => MANAGEMENT_ROLES.includes(r))) {
    return true
  }
  if (user.roles.includes('Teacher')) {
    if (!teacherAssignedClassIds.includes(classId)) {
      const err = new Error('You do not have access to this resource')
      err.code = 'FORBIDDEN'
      throw err
    }
    return true
  }
  const err = new Error('You do not have access to this resource')
  err.code = 'FORBIDDEN'
  throw err
}

function assertStudentInScope(user, targetStudentId, context = {}) {
  // 1. Management bypass
  if (user.roles.some(r => MANAGEMENT_ROLES.includes(r))) {
    return true
  }

  // 2. Student self-only
  if (user.roles.includes('Student')) {
    if (user.id !== targetStudentId && context.studentProfileId !== user.id) {
      const err = new Error('You do not have access to this resource')
      err.code = 'FORBIDDEN'
      throw err
    }
    return true
  }

  // 3. Parent of child only
  if (user.roles.includes('Parent')) {
    const parentChildrenIds = context.parentChildrenIds || []
    if (!parentChildrenIds.includes(targetStudentId)) {
      const err = new Error('You do not have access to this resource')
      err.code = 'FORBIDDEN'
      throw err
    }
    return true
  }

  // 4. Teacher with assigned class
  if (user.roles.includes('Teacher')) {
    const teacherStudentIds = context.teacherStudentIds || []
    if (!teacherStudentIds.includes(targetStudentId)) {
      const err = new Error('You do not have access to this resource')
      err.code = 'FORBIDDEN'
      throw err
    }
    return true
  }

  const err = new Error('You do not have access to this resource')
  err.code = 'FORBIDDEN'
  throw err
}

test('Class Scope Isolation: Management roles have universal class access', () => {
  for (const role of MANAGEMENT_ROLES) {
    const user = { id: 'mgmt-1', roles: [role] }
    assert.doesNotThrow(() => assertClassInScope(user, 'any-class-id'))
  }
})

test('Class Scope Isolation: Teacher is confined to assigned classes', () => {
  const teacherUser = { id: 'teacher-1', roles: ['Teacher'] }
  const assignedClasses = ['class-primary-1', 'class-primary-2']

  // Accessing assigned class succeeds
  assert.doesNotThrow(() =>
    assertClassInScope(teacherUser, 'class-primary-1', assignedClasses)
  )

  // Accessing unassigned class throws FORBIDDEN
  assert.throws(
    () => assertClassInScope(teacherUser, 'class-secondary-1', assignedClasses),
    { code: 'FORBIDDEN', message: 'You do not have access to this resource' }
  )
})

test('Student Scope Isolation: Student can only access own data', () => {
  const studentUser = { id: 'student-uuid-1', roles: ['Student'] }

  // Accessing own student record succeeds
  assert.doesNotThrow(() =>
    assertStudentInScope(studentUser, 'student-uuid-1')
  )

  // Accessing peer student record throws FORBIDDEN
  assert.throws(
    () => assertStudentInScope(studentUser, 'student-uuid-2'),
    { code: 'FORBIDDEN', message: 'You do not have access to this resource' }
  )
})

test('Student Scope Isolation: Parent can only access own children', () => {
  const parentUser = { id: 'parent-1', roles: ['Parent'] }
  const parentContext = { parentChildrenIds: ['child-1', 'child-2'] }

  // Accessing own child succeeds
  assert.doesNotThrow(() =>
    assertStudentInScope(parentUser, 'child-1', parentContext)
  )

  // Accessing stranger student throws FORBIDDEN
  assert.throws(
    () => assertStudentInScope(parentUser, 'child-stranger', parentContext),
    { code: 'FORBIDDEN', message: 'You do not have access to this resource' }
  )
})
