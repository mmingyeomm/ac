use anchor_lang::prelude::*;
declare_id!("9zuEtiy6MeucRyUTkUTy8ydX9A35cKBawnrHkU3CULvf");

#[program]
pub mod dao {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        dao.voters = ctx.accounts.voters.to_account_info().key();
        dao.threshold = 100; // 100% for unanimous
        dao.voting_period = 86400; // 1 day in seconds
        Ok(())
}

    pub fn vote(ctx: Context<Vote>, proposal_id: u64, vote: bool) -> Result<()> {
        let voter = &mut ctx.accounts.voter;
        voter.proposal_id = proposal_id;
        voter.vote = vote;
        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>, proposal_id: u64) -> Result<()> {
        let dao = &ctx.accounts.dao;
        let voters = &ctx.accounts.voters;
        let mut yes_votes = 0;
        let mut no_votes = 0;

        for voter in voters.voters.iter() {
            if voter.proposal_id == proposal_id {
                if voter.vote {
                    yes_votes += 1;
                } else {
                    no_votes += 1;
                }
            }
        }

        if yes_votes > 0 && no_votes == 0 && yes_votes == voters.voters.len() as u64 {
            // Unanimous vote, execute the proposal
            msg!("Proposal {} passed unanimously and executed.", proposal_id);
            Ok(())
        } else {
            Err(ErrorCode::ProposalNotPassed.into())
        }
    }
}

#[account]
pub struct Dao {
    pub voters: Pubkey,
    pub threshold: u8,
    pub voting_period: i64,
}

#[account]
pub struct Voter {
    pub proposal_id: u64,
    pub vote: bool,
}

#[account]
pub struct Voters {
    pub voters: Vec<Voter>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1 + 8)]
    pub dao: Account<'info, Dao>,
    #[account(init, payer = user, space = 8 + 4 + 400)] // Assuming 20 voters max
    pub voters: Account<'info, Voters>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Account<'info, Voter>,
    pub dao: Account<'info, Dao>,
    pub voters: Account<'info, Voters>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub voters: Account<'info, Voters>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("The proposal did not pass.")]
    ProposalNotPassed,
}