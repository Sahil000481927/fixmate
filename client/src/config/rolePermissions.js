const rolePermissions = {
    admin: {
        can_manage_users: true,
        can_view_all_requests: true,
        can_assign_tasks: true,
        can_update_status: false,
        can_submit_requests: false,
    },
    maintenance_lead: {
        can_manage_users: false,
        can_view_all_requests: false,
        can_assign_tasks: true,
        can_update_status: true,
        can_submit_requests: false,
    },
    technician: {
        can_manage_users: false,
        can_view_all_requests: false,
        can_assign_tasks: false,
        can_update_status: true,
        can_submit_requests: true,
    },
    operator: {
        can_manage_users: false,
        can_view_all_requests: false,
        can_assign_tasks: false,
        can_update_status: false,
        can_submit_requests: true,
    },
};

export default rolePermissions;
