"""empty message

Revision ID: b805df721885
Revises: 8a6419f289aa
Create Date: 2022-06-23 12:18:09.218580

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b805df721885'
down_revision = '8a6419f289aa'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('projects', sa.Column('earliestStreetImagery', sa.DateTime(), nullable=True))
    op.drop_index('idx_task_validation_mapper_status_composite', table_name='task_invalidation_history')
    op.create_index('idx_task_validation_mapper_status_composite', 'task_invalidation_history', ['invalidator_id', 'is_closed'], unique=False)
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('idx_task_validation_mapper_status_composite', table_name='task_invalidation_history')
    op.create_index('idx_task_validation_mapper_status_composite', 'task_invalidation_history', ['mapper_id', 'is_closed'], unique=False)
    op.drop_column('projects', 'earliestStreetImagery')
    # ### end Alembic commands ###