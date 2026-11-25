/**
 * @file src/modules/employees/employeeNameSync.js
 * @description Propagates an employee's name change to every collection that
 * stores a denormalized copy of it.
 *
 * Two kinds of references exist in the schema:
 *  1. ID-linked copies  (employeeId + employeeName, managerId + manager, ...)
 *     -> matched by the employee's business ID, always safe.
 *  2. Name-only references (team.leader, project.manager/leader/members,
 *     employee.teamLeader/projectManager) -> matched by the old name.
 *
 * Every update runs independently; one failing collection never blocks the rest.
 * Runs inside the caller's tenant context, so all models resolve to the
 * active company's database.
 */

import logger from '../../config/logger.js';
import Employee from './employees.model.js';
import Attendance from '../attendance/attendance.model.js';
import AttendanceCorrection from '../attendance-corrections/attendance-correction.model.js';
import Leave from '../leaves/leaves.model.js';
import AppraisalReview from '../appraisal-reviews/appraisal-reviews.model.js';
import WorkReport from '../work-reports/work-reports.model.js';
import PayrollQuery from '../payroll-queries/payroll-query.model.js';
import {
  PayrollReimbursement,
  PayrollLoanAdvance,
  PayrollBonus,
  PayrollPayment
} from '../payroll/payroll.model.js';
import { AnnouncementTrackingLog } from '../announcements/announcement.model.js';
import { UserSession } from '../security/security.model.js';
import Task from '../tasks/tasks.model.js';
import Branch from '../branches/branches.model.js';
import Department from '../departments/departments.model.js';
import Team from '../teams/teams.model.js';
import Project from '../projects/projects.model.js';
import Conversation from '../chat/conversation.model.js';
import Message from '../chat/message.model.js';
import Call from '../chat/call.model.js';

/**
 * @param {Object} params
 * @param {String} params.employeeId - Business ID of the renamed employee
 * @param {String} params.oldName
 * @param {String} params.newName
 */
export const propagateEmployeeNameChange = async ({ employeeId, oldName, newName }) => {
  const prev = (oldName || '').trim();
  const next = (newName || '').trim();
  if (!employeeId || !next || prev === next) return;

  const ops = [
    // ── 1. ID-linked copies ──────────────────────────────────────────────
    ['Attendance', () => Attendance.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['AttendanceCorrection', () => AttendanceCorrection.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['Leave', () => Leave.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['AppraisalReview', () => AppraisalReview.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['WorkReport', () => WorkReport.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['PayrollQuery', () => PayrollQuery.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['PayrollReimbursement', () => PayrollReimbursement.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['PayrollLoanAdvance', () => PayrollLoanAdvance.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['PayrollBonus', () => PayrollBonus.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['PayrollPayment', () => PayrollPayment.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['AnnouncementTrackingLog', () => AnnouncementTrackingLog.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['UserSession', () => UserSession.updateMany({ employeeId }, { $set: { employeeName: next } })],
    ['Task', () => Task.updateMany({ assigneeId: employeeId }, { $set: { assigneeName: next } })],
    ['Branch.manager', () => Branch.updateMany({ managerId: employeeId }, { $set: { manager: next } })],
    ['Department.head', () => Department.updateMany({ headId: employeeId }, { $set: { head: next } })],
    ['Team.membersList', () => Team.updateMany(
      { 'membersList.id': employeeId },
      { $set: { 'membersList.$[m].name': next } },
      { arrayFilters: [{ 'm.id': employeeId }] }
    )],
    ['Project.tasks.assignee', () => Project.updateMany(
      { 'tasks.assigneeId': employeeId },
      { $set: { 'tasks.$[t].assigneeName': next } },
      { arrayFilters: [{ 't.assigneeId': employeeId }] }
    )],
    ['Project.tasks.assignedBy', () => Project.updateMany(
      { 'tasks.assignedById': employeeId },
      { $set: { 'tasks.$[t].assignedByName': next } },
      { arrayFilters: [{ 't.assignedById': employeeId }] }
    )],
    ['Conversation.participants', () => Conversation.updateMany(
      { 'participants.employeeId': employeeId },
      { $set: { 'participants.$[p].name': next } },
      { arrayFilters: [{ 'p.employeeId': employeeId }] }
    )],
    ['Message.sender', () => Message.updateMany({ senderId: employeeId }, { $set: { senderName: next } })],
    ['Call.caller', () => Call.updateMany({ callerId: employeeId }, { $set: { callerName: next } })],
    ['Call.callee', () => Call.updateMany({ calleeId: employeeId }, { $set: { calleeName: next } })]
  ];

  // ── 2. Name-only references (need the old name to match) ───────────────
  if (prev) {
    ops.push(
      ['Team.leader', () => Team.updateMany({ leader: prev }, { $set: { leader: next } })],
      ['Project.manager', () => Project.updateMany({ manager: prev }, { $set: { manager: next } })],
      ['Project.leader', () => Project.updateMany({ leader: prev }, { $set: { leader: next } })],
      ['Project.members', () => Project.updateMany(
        { members: prev },
        { $set: { 'members.$[x]': next } },
        { arrayFilters: [{ x: prev }] }
      )],
      ['Employee.teamLeader', () => Employee.updateMany({ teamLeader: prev }, { $set: { teamLeader: next } })],
      ['Employee.projectManager', () => Employee.updateMany({ projectManager: prev }, { $set: { projectManager: next } })]
    );
  }

  const results = await Promise.allSettled(ops.map(([, run]) => run()));

  let touched = 0;
  results.forEach((r, i) => {
    const label = ops[i][0];
    if (r.status === 'rejected') {
      logger.error(`employeeNameSync: failed to update ${label}: ${r.reason?.message || r.reason}`);
    } else {
      touched += r.value?.modifiedCount || 0;
    }
  });

  logger.info(`employeeNameSync: "${prev}" -> "${next}" (${employeeId}) updated ${touched} document(s)`);
};

export default propagateEmployeeNameChange;
